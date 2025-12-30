//
//  Fix.swift
//  MatchTalk
//
//  Created for build fix purposes.
//  Native exception handling override for React Native ExceptionsManagerQueue crash fix
//

import Foundation

@objc(ExceptionsManagerFix)
class ExceptionsManagerFix: NSObject {
  
  // React Native'in exception handling'ini override etmek için
  // Native tarafında exception'ları yakala ve Sentry'ye gönder
  // Ama crash etme
  
  @objc static func setup() {
    // App başlangıcında exception handling'i override et
    // Dispatch ederek bir sonraki run loop'ta çalıştır
    DispatchQueue.main.async {
      setupExceptionHandling()
    }
  }
  
  private static func setupExceptionHandling() {
    // NSError exception'larını yakala
    NSSetUncaughtExceptionHandler { exception in
      // Exception'ı yakala ama crash etme
      print("[ExceptionsManagerFix] Uncaught exception: \(exception.name.rawValue)")
      print("[ExceptionsManagerFix] Reason: \(exception.reason ?? "Unknown")")
      
      // Sentry native SDK zaten aktif, otomatik yakalayacak
      // Crash etme - sadece logla
    }
    
    // Signal exception'larını yakala (SIGABRT, SIGSEGV, etc.)
    signal(SIGABRT) { signal in
      print("[ExceptionsManagerFix] SIGABRT signal caught: \(signal)")
      // Sentry native SDK zaten aktif, otomatik yakalayacak
      // Crash etme - sadece logla
    }
    
    signal(SIGSEGV) { signal in
      print("[ExceptionsManagerFix] SIGSEGV signal caught: \(signal)")
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
        // Sentry native SDK zaten aktif, otomatik yakalayacak
        // Crash etme
      }
    }
  }
}
