import Foundation
import Vision
import AppKit

// Usage: facecount <image_path>  -> prints face count (integer) to stdout
guard CommandLine.arguments.count > 1 else { print("0"); exit(0) }
let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("0"); exit(0)
}
let req = VNDetectFaceRectanglesRequest()
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
do {
    try handler.perform([req])
    let n = (req.results as? [VNFaceObservation])?.count ?? 0
    print(n)
} catch {
    print("0")
}
