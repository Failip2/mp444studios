# Video

Drop the featured film here as `bryllup.mp4`, then check that
`film.src` in `src/content/home.ts` matches the filename.

The section on the homepage renders correctly before the file exists — the
poster photograph shows and the play button hides itself if the video cannot be
loaded — so this directory being empty is not a broken build.

## Encoding

Served straight off disk by nginx with no transcoding, so the file you put here
is the file every visitor downloads. Keep it small:

```bash
ffmpeg -i input.mov -c:v libx264 -profile:v high -crf 23 -preset slow \
  -vf "scale=1920:-2" -c:a aac -b:a 128k -movflags +faststart bryllup.mp4
```

`-movflags +faststart` matters: it moves the index to the front of the file so
playback can begin before the whole thing has downloaded.

Anything much over ~30 MB is worth a second look.
