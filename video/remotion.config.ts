import { Config } from "@remotion/cli/config";

// JPEG frames keep Studio and draft renders fast; stills/poster default to PNG.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
