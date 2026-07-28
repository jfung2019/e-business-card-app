import Foundation

@objc(AppEnvironmentModule)
class AppEnvironmentModule: NSObject {
  @objc
  static func moduleName() -> String! {
    "AppEnvironment"
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc
  func constantsToExport() -> [AnyHashable: Any]! {
    let env = Bundle.main.object(forInfoDictionaryKey: "AppEnvironment") as? String
    return ["appEnvironment": env ?? "dev"]
  }
}
