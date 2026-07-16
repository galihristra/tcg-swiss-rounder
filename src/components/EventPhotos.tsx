import { useCallback, useEffect, useState } from 'react';
import {
  deleteEventPhoto,
  listEventPhotos,
  uploadEventPhoto,
} from '../lib/eventStore';
import type { EventPhoto } from '../lib/eventStore';
import { compressImage } from '../lib/imageCompress';

interface EventPhotosProps {
  eventId: string;
  isAdmin: boolean;
}

export default function EventPhotos({ eventId, isAdmin }: EventPhotosProps) {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setPhotos([]);
    setLightboxIndex(null);
    listEventPhotos(eventId)
      .then(setPhotos)
      .catch((e) => console.error('Failed to list photos', e));
  }, [eventId]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const showPrev = useCallback(
    () => setLightboxIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length)),
    [photos.length],
  );
  const showNext = useCallback(
    () => setLightboxIndex((i) => (i === null ? i : (i + 1) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') showPrev();
      else if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, closeLightbox, showPrev, showNext]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setErrors([]);
    setUploadTotal(files.length);
    setUploadingCount(files.length);
    for (const file of files) {
      try {
        const blob = await compressImage(file);
        const photo = await uploadEventPhoto(eventId, blob);
        setPhotos((prev) => [...prev, photo]);
      } catch (e) {
        setErrors((prev) => [
          ...prev,
          `${file.name}: ${e instanceof Error ? e.message : String(e)}`,
        ]);
      } finally {
        setUploadingCount((prev) => prev - 1);
      }
    }
  };

  const handleDelete = async (photo: EventPhoto) => {
    setDeletingId(photo.id);
    try {
      await deleteEventPhoto(photo);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (e) {
      setErrors((prev) => [...prev, e instanceof Error ? e.message : String(e)]);
    } finally {
      setDeletingId(null);
    }
  };

  const activePhoto = lightboxIndex === null ? null : photos[lightboxIndex];

  return (
    <div>
      {isAdmin && (
        <label className="tk-btn ghost tk-btn--sm">
          Add Photos
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      )}
      {uploadingCount > 0 && (
        <div className="tk-hint">
          Uploading {uploadTotal - uploadingCount + 1} of {uploadTotal}…
        </div>
      )}
      {errors.map((msg, i) => (
        <div className="tk-hint tk-error" key={i}>
          {msg}
        </div>
      ))}
      {photos.length === 0 && uploadingCount === 0 ? (
        !isAdmin && (
          <div className="tk-empty tk-empty--spaced">No photos yet.</div>
        )
      ) : (
        <div className="tk-photo-grid">
          {photos.map((photo, i) => (
            <div className="tk-photo-item" key={photo.id}>
              <button
                className="tk-photo-open"
                onClick={() => setLightboxIndex(i)}
                aria-label="View photo"
              >
                <img
                  src={photo.url}
                  alt=""
                  loading="lazy"
                  className="tk-photo-thumb"
                />
              </button>
              {isAdmin && (
                <button
                  className="tk-photo-delete"
                  onClick={() => handleDelete(photo)}
                  disabled={deletingId === photo.id}
                  aria-label="Delete photo"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {activePhoto && (
        <div className="tk-lightbox-backdrop" onClick={closeLightbox}>
          <button
            className="tk-lightbox-close"
            onClick={closeLightbox}
            aria-label="Close"
          >
            ×
          </button>
          {photos.length > 1 && (
            <button
              className="tk-lightbox-nav tk-lightbox-prev"
              onClick={(e) => {
                e.stopPropagation();
                showPrev();
              }}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}
          <img
            className="tk-lightbox-img"
            src={activePhoto.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <button
              className="tk-lightbox-nav tk-lightbox-next"
              onClick={(e) => {
                e.stopPropagation();
                showNext();
              }}
              aria-label="Next photo"
            >
              ›
            </button>
          )}
          {photos.length > 1 && (
            <div className="tk-lightbox-counter">
              {lightboxIndex! + 1} / {photos.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
