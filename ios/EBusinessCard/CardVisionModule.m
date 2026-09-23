#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CardVisionModule, NSObject)

RCT_EXTERN_METHOD(detectCardQuad:(NSString *)uri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(detectCardQuadInLuma:(NSString *)luma
                  width:(nonnull NSNumber *)width
                  height:(nonnull NSNumber *)height
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(warpCard:(NSString *)uri
                  quad:(NSArray *)quad
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
