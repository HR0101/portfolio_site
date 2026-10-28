import SwiftUI
import AppKit

// Compile together with the app's unmodified SkyBackground, SkyPalette and WeatherModels.
enum AppDate {
  static func now() -> Date { Date(timeIntervalSince1970: 1_788_796_800) }
}
enum L10n {
  enum Weather {
    static let invalidURL = "invalidURL"
    static let requestFailed = "requestFailed"
    static let decodingFailed = "decodingFailed"
  }
}

@main
struct BackgroundExport {
  @MainActor static func main() throws {
    let output = CommandLine.arguments[1]
    for (name, hour) in [("dawn", 6.0), ("day", 11.0), ("sunset", 17.5), ("night", 21.0)] {
      let view = SkyCanvas()
        .environment(\.sky, SkyPalette.at(hour: hour, season: .autumn))
        .environment(\.skyWeather, SkyWeather.clear)
        .frame(width: 402, height: 874)
      let renderer = ImageRenderer(content: view)
      renderer.scale = 3
      guard let cgImage = renderer.cgImage else { fatalError("Rendering failed: \(name)") }
      let bitmap = NSBitmapImageRep(cgImage: cgImage)
      guard let png = bitmap.representation(using: .png, properties: [:]) else { fatalError("PNG failed") }
      let url = URL(fileURLWithPath: output).appendingPathComponent("bustimeapp-background-\(name).png")
      try png.write(to: url)
      print(url.path)
    }
  }
}
