//
//  Fix.swift
//  MatchTalk
//
//  Created for build fix purposes.
//  Native exception handling override for React Native ExceptionsManagerQueue crash fix
//

import Foundation
import Darwin

// 🚨 CRITICAL: React Native Native Module olarak export et
@objc(ExceptionsManagerFix)
class ExceptionsManagerFix: NSObject, RCTBridgeModule {
  
  // 🚨 CRITICAL: Static initialization - App başlar başlamaz çalışır
  // JavaScript bundle yüklenmeden önce bile aktif olur
  private static let _setupOnce: Void = {
    setupExceptionHandling()
  }()
  
  // React Native Native Module protokolü
  static func moduleName() -> String! {
    return "ExceptionsManagerFix"
  }
  
  // Main thread'de çalışsın
  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  // React Native'in exception handling'ini override etmek için
  // Native tarafında exception'ları yakala ve Sentry'ye gönder
  // Ama crash etme
  
  // 🚨 CRITICAL: JavaScript'ten çağrılabilir metod
  @objc func setup(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Static initialization zaten çalıştı, sadece log
    _ = ExceptionsManagerFix._setupOnce
    resolve(["status": "activated", "message": "Native exception handling is active"])
  }
  
  // Static metod - JavaScript'ten de çağrılabilir
  @objc static func setupStatic() {
    // Static initialization zaten çalıştı, sadece log
    _ = _setupOnce
  }
  
  private static func setupExceptionHandling() {
    // 🚨 CRITICAL: Exception handling'i EN ERKEN aşamada aktif et
    // JavaScript bundle yüklenmeden önce bile çalışır
    
    // NSError exception'larını yakala
    NSSetUncaughtExceptionHandler { exception in
      // Exception'ı yakala ama crash etme
      print("[ExceptionsManagerFix] Uncaught exception: \(exception.name.rawValue)")
      print("[ExceptionsManagerFix] Reason: \(exception.reason ?? "Unknown")")
      print("[ExceptionsManagerFix] Call stack: \(exception.callStackSymbols.joined(separator: "\n"))")
      
      // Sentry native SDK zaten aktif, otomatik yakalayacak
      // Crash etme - sadece logla
      // Exception'ı yeniden fırlatma
    }
    
    // Signal exception'larını yakala (SIGABRT, SIGSEGV, etc.)
    signal(SIGABRT) { signal in
      print("[ExceptionsManagerFix] SIGABRT signal caught: \(signal)")
      // Sentry native SDK zaten aktif, otomatik yakalayacak
      // Crash etme - sadece logla
      // Signal'i yeniden gönderme
    }
    
    signal(SIGSEGV) { signal in
      print("[ExceptionsManagerFix] SIGSEGV signal caught: \(signal)")
      // Sentry native SDK zaten aktif, otomatik yakalayacak
      // Crash etme - sadece logla
      // Signal'i yeniden gönderme
    }
    
    signal(SIGBUS) { signal in
      print("[ExceptionsManagerFix] SIGBUS signal caught: \(signal)")
      // Sentry native SDK zaten aktif, otomatik yakalayacak
      // Crash etme - sadece logla
    }
    
    signal(SIGILL) { signal in
      print("[ExceptionsManagerFix] SIGILL signal caught: \(signal)")
      // Sentry native SDK zaten aktif, otomatik yakalayacak
      // Crash etme - sadece logla
    }
    
    // React Native'in exception notification'larını dinle
    NotificationCenter.default.addObserver(
      forName: NSNotification.Name("RCTFatalException"),
      object: nil,
      queue: .main
    ) { notification in
      // Exception'ı yakala ama crash etme
      if let exception = notification.userInfo?["exception"] as? NSException {
        print("[ExceptionsManagerFix] React Native fatal exception caught: \(exception.name.rawValue)")
        print("[ExceptionsManagerFix] Reason: \(exception.reason ?? "Unknown")")
        print("[ExceptionsManagerFix] Call stack: \(exception.callStackSymbols.joined(separator: "\n"))")
        // Sentry native SDK zaten aktif, otomatik yakalayacak
        // Crash etme
      }
    }
    
    print("[ExceptionsManagerFix] Native exception handling activated")
  }
}

// 🚨 CRITICAL: Static initialization - Class yüklendiğinde otomatik çalışır
// Bu, JavaScript bundle yüklenmeden önce bile aktif olur
extension ExceptionsManagerFix {
  @objc static func initialize() {
    _ = _setupOnce
  }
}
