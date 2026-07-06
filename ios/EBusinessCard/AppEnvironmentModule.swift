import Foundation
import React

@objc(AppEnvironmentModule)
class AppEnvironmentModule: NSObject, RCTBridgeModule {
  static func moduleName() -> String! {
    "AppEnvironment"
  }

  static func requiresMainQueueSetup() -> Bool {
    false
  }

  func constantsToExport() -> [AnyHashable: Any]! {
    let env = Bundle.main.object(forInfoDictionaryKey: "AppEnvironment") as? String
    return ["appEnvironment": env ?? "dev"]
  }
}
