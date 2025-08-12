# Package

version       = "0.1.0"
author        = "bit0r1n"
description   = "A new awesome nimble package"
license       = "MIT"
srcDir        = "src"
bin           = @["parser"]
binDir        = "bin"


# Dependencies

requires "nim >= 2.0.0"
requires "jester"
requires "https://github.com/bit0r1n/mitso == 0.3.5"
