import { useRef } from 'react'

type MechanismClipProps = {
  src: string
  poster: string
  title: string
  description: string
  caption: string
  captionsSrc?: string
}

export function MechanismClip({
  src,
  poster,
  title,
  description,
  caption,
  captionsSrc,
}: MechanismClipProps) {
  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  return (
    <figure className="mechanism-clip">
      {reduced.current ? (
        <img src={poster} alt={description} width={854} height={480} />
      ) : (
        <video
          controls
          playsInline
          preload="metadata"
          poster={poster}
          width={854}
          height={480}
          aria-label={description}
        >
          <source src={src} type="video/mp4" />
          {captionsSrc ? (
            <track kind="captions" src={captionsSrc} srcLang="en" label="Captions" default />
          ) : null}
        </video>
      )}
      <figcaption>
        <span className="mechanism-clip-kicker mono">{title}</span>
        {caption}
      </figcaption>
    </figure>
  )
}
