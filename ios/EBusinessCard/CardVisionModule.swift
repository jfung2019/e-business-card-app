import CoreImage
import CoreVideo
import Foundation
import UIKit
import Vision

/// Card edge detection and dewarping on Apple's own stack — the same pair of
/// APIs VisionKit's document scanner uses internally:
/// `VNDetectRectanglesRequest` to find the card, `CIPerspectiveCorrection` to
/// flatten it.
///
/// Quads cross the bridge as `[{x, y}]` normalized to the image, origin
/// top-left, ordered TL, TR, BR, BL — the same shape as `CardQuad` in JS.
@objc(CardVisionModule)
class CardVisionModule: NSObject {
  /// Long edge of the dewarped card, matching the OpenCV path.
  private static let outputLongEdge: CGFloat = 1600

  /// Pushes each corner this fraction further out from the centre so OCR never
  /// clips a character at the card edge.
  private static let edgeExpansion: CGFloat = 0.01

  private let context = CIContext(options: [.useSoftwareRenderer: false])
  private let workQueue = DispatchQueue(label: "com.megaannumai.ebusinesscard.cardvision", qos: .userInitiated)
  /// Live frames get their own queue so a slow still never stalls the overlay.
  private let liveQueue = DispatchQueue(label: "com.megaannumai.ebusinesscard.cardvision.live", qos: .userInteractive)

  @objc
  static func moduleName() -> String! {
    "CardVision"
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  // The blocks are declared as plain closures rather than
  // RCTPromiseResolveBlock/RCTPromiseRejectBlock so this file needs no React
  // import; the signatures are ABI-identical.

  /// Still detection on a captured photo.
  @objc(detectCardQuad:resolver:rejecter:)
  func detectCardQuad(
    _ uri: String,
    resolver resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    workQueue.async {
      guard let image = Self.loadImage(uri) else {
        reject("E_IMAGE", "Could not read the captured photo.", nil)
        return
      }
      do {
        resolve(try Self.detect(in: VNImageRequestHandler(ciImage: image, options: [:])))
      } catch {
        reject("E_VISION", error.localizedDescription, error)
      }
    }
  }

  /// Live detection on the scanner's downsampled grayscale preview frame.
  ///
  /// `luma` is one UTF-16 code unit per pixel (value 1...255), row-major —
  /// the format the frame worklet already produces for the OpenCV path.
  @objc(detectCardQuadInLuma:width:height:resolver:rejecter:)
  func detectCardQuadInLuma(
    _ luma: String,
    width: NSNumber,
    height: NSNumber,
    resolver resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    liveQueue.async {
      let w = width.intValue
      let h = height.intValue
      let units = Array(luma.utf16)
      guard w > 0, h > 0, units.count == w * h else {
        reject("E_FRAME", "Frame sample has the wrong size.", nil)
        return
      }

      var pixelBuffer: CVPixelBuffer?
      let status = CVPixelBufferCreate(
        kCFAllocatorDefault, w, h, kCVPixelFormatType_OneComponent8, nil, &pixelBuffer)
      guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
        reject("E_FRAME", "Could not allocate a frame buffer.", nil)
        return
      }

      CVPixelBufferLockBaseAddress(buffer, [])
      if let base = CVPixelBufferGetBaseAddress(buffer) {
        let rowBytes = CVPixelBufferGetBytesPerRow(buffer)
        let pixels = base.assumingMemoryBound(to: UInt8.self)
        for y in 0..<h {
          let row = pixels.advanced(by: y * rowBytes)
          let offset = y * w
          for x in 0..<w {
            row[x] = UInt8(truncatingIfNeeded: units[offset + x])
          }
        }
      }
      CVPixelBufferUnlockBaseAddress(buffer, [])

      do {
        resolve(try Self.detect(in: VNImageRequestHandler(cvPixelBuffer: buffer, options: [:])))
      } catch {
        reject("E_VISION", error.localizedDescription, error)
      }
    }
  }

  @objc(warpCard:quad:resolver:rejecter:)
  func warpCard(
    _ uri: String,
    quad: [[String: NSNumber]],
    resolver resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    workQueue.async {
      guard let image = Self.loadImage(uri) else {
        reject("E_IMAGE", "Could not read the captured photo.", nil)
        return
      }
      guard quad.count == 4 else {
        reject("E_QUAD", "Expected four corners.", nil)
        return
      }

      let extent = image.extent
      let normalized = quad.map { corner in
        CGPoint(x: CGFloat(corner["x"]?.doubleValue ?? 0), y: CGFloat(corner["y"]?.doubleValue ?? 0))
      }
      let expanded = Self.expand(normalized, by: Self.edgeExpansion)
      // Core Image works in pixels with a bottom-left origin.
      let pixels = expanded.map { point in
        CIVector(
          x: extent.minX + point.x * extent.width,
          y: extent.minY + (1 - point.y) * extent.height
        )
      }

      guard let filter = CIFilter(name: "CIPerspectiveCorrection") else {
        reject("E_FILTER", "Perspective correction is unavailable.", nil)
        return
      }
      filter.setValue(image, forKey: kCIInputImageKey)
      filter.setValue(pixels[0], forKey: "inputTopLeft")
      filter.setValue(pixels[1], forKey: "inputTopRight")
      filter.setValue(pixels[2], forKey: "inputBottomRight")
      filter.setValue(pixels[3], forKey: "inputBottomLeft")

      guard var output = filter.outputImage, output.extent.width > 0, output.extent.height > 0 else {
        reject("E_FILTER", "Could not flatten the card.", nil)
        return
      }

      let scale = Self.outputLongEdge / max(output.extent.width, output.extent.height)
      output = output
        .transformed(by: CGAffineTransform(translationX: -output.extent.minX, y: -output.extent.minY))
        .transformed(by: CGAffineTransform(scaleX: scale, y: scale))

      guard let cgImage = self.context.createCGImage(output, from: output.extent),
            let data = UIImage(cgImage: cgImage).jpegData(compressionQuality: 0.92)
      else {
        reject("E_ENCODE", "Could not encode the cropped card.", nil)
        return
      }

      let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      let millis = Int(Date().timeIntervalSince1970 * 1000)
      let fileURL = cacheDir.appendingPathComponent("card-scan-\(millis).jpg")
      do {
        try data.write(to: fileURL, options: .atomic)
        resolve(fileURL.absoluteString)
      } catch {
        reject("E_WRITE", error.localizedDescription, error)
      }
    }
  }

  /// Runs the rectangle request and returns the best card as normalized,
  /// top-left-origin corners, or `nil` when none qualifies.
  private static func detect(in handler: VNImageRequestHandler) throws -> [[String: Double]]? {
    let request = VNDetectRectanglesRequest()
    // Vision measures aspect as short side / long side. A business card is
    // ~0.6; the band is wide because perspective skews it.
    request.minimumAspectRatio = 0.4
    request.maximumAspectRatio = 0.9
    request.minimumSize = 0.2
    request.minimumConfidence = 0.6
    request.quadratureTolerance = 30
    request.maximumObservations = 1

    try handler.perform([request])

    guard let observation = request.results?.first else {
      return nil
    }
    // Vision's origin is bottom-left; the JS side is top-left.
    return [
      observation.topLeft,
      observation.topRight,
      observation.bottomRight,
      observation.bottomLeft,
    ].map { point in
      ["x": Double(point.x), "y": Double(1 - point.y)]
    }
  }

  /// Loads `uri` upright. The working photo already has EXIF baked in, but
  /// honouring the orientation tag keeps this correct for any other input.
  private static func loadImage(_ uri: String) -> CIImage? {
    let url = uri.hasPrefix("file://") ? URL(string: uri) : URL(fileURLWithPath: uri)
    guard let url else {
      return nil
    }
    return CIImage(contentsOf: url, options: [.applyOrientationProperty: true])
  }

  private static func expand(_ points: [CGPoint], by fraction: CGFloat) -> [CGPoint] {
    let cx = points.reduce(0) { $0 + $1.x } / CGFloat(points.count)
    let cy = points.reduce(0) { $0 + $1.y } / CGFloat(points.count)
    return points.map { point in
      CGPoint(
        x: min(1, max(0, cx + (point.x - cx) * (1 + fraction))),
        y: min(1, max(0, cy + (point.y - cy) * (1 + fraction)))
      )
    }
  }
}
