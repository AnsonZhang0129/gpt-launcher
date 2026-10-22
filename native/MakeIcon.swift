import AppKit
let destination = CommandLine.arguments[1]
let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)
image.lockFocus()
let rect = NSRect(x: 0, y: 0, width: 1024, height: 1024)
NSColor(srgbRed: 0.09, green: 0.09, blue: 0.10, alpha: 1).setFill()
NSBezierPath(roundedRect: rect.insetBy(dx: 42, dy: 42), xRadius: 220, yRadius: 220).fill()
let path = NSBezierPath()
path.move(to: NSPoint(x: 254, y: 330))
path.curve(to: NSPoint(x: 682, y: 715), controlPoint1: NSPoint(x: 180, y: 650), controlPoint2: NSPoint(x: 800, y: 850))
path.curve(to: NSPoint(x: 350, y: 290), controlPoint1: NSPoint(x: 570, y: 530), controlPoint2: NSPoint(x: 440, y: 420))
path.curve(to: NSPoint(x: 780, y: 520), controlPoint1: NSPoint(x: 185, y: 90), controlPoint2: NSPoint(x: 820, y: 195))
path.lineWidth = 90; path.lineCapStyle = .round; path.lineJoinStyle = .round
NSColor(srgbRed: 0.73, green: 0.66, blue: 0.96, alpha: 1).setStroke(); path.stroke()
let highlight = NSBezierPath()
highlight.move(to: NSPoint(x: 254, y: 330)); highlight.curve(to: NSPoint(x: 682, y: 715), controlPoint1: NSPoint(x: 180, y: 650), controlPoint2: NSPoint(x: 800, y: 850))
highlight.lineWidth = 90; highlight.lineCapStyle = .round
NSColor(srgbRed: 0.98, green: 0.66, blue: 0.56, alpha: 1).setStroke(); highlight.stroke()
image.unlockFocus()
let rep = NSBitmapImageRep(data: image.tiffRepresentation!)!
try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: destination))
