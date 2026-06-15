"use client";

import Image from "@/platform/image/Image";

const CARD_WIDTH_PX = 280;
const PHOTO_VISIBLE_HEIGHT_RATIO = 0.9;
const DEFAULT_PHOTO_ASPECT_HEIGHT_RATIO = 2 / 3;

function resolveVisiblePhotoHeight(photo) {
  const width = Number(photo?.width);
  const height = Number(photo?.height);
  const heightRatio =
    Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
      ? height / width
      : DEFAULT_PHOTO_ASPECT_HEIGHT_RATIO;

  return Math.round(CARD_WIDTH_PX * heightRatio * PHOTO_VISIBLE_HEIGHT_RATIO);
}

export default function AircraftPreviewMediaCard({ photo }) {
  const style = {
    "--aircraft-preview-media-height": `${resolveVisiblePhotoHeight(photo)}px`,
  };

  return (
    <div
      className="aircraft-preview-media-card aircraft-preview-media-card--photo"
      aria-hidden="true"
      style={style}
    >
      <div className="aircraft-preview-media-card__photo">
        <Image
          className="aircraft-preview-media-card__image"
          src={photo.src}
          width={photo.width || CARD_WIDTH_PX}
          height={photo.height || Math.round(CARD_WIDTH_PX * DEFAULT_PHOTO_ASPECT_HEIGHT_RATIO)}
          alt=""
          draggable="false"
          unoptimized
        />
      </div>
      <span className="aircraft-preview-photo__credit">
        {photo.photographer || photo.source}
      </span>
    </div>
  );
}
