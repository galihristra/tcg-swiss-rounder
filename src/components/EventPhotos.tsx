import { useEffect, useState } from 'react';
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

  useEffect(() => {
    setPhotos([]);
    listEventPhotos(eventId)
      .then(setPhotos)
      .catch((e) => console.error('Failed to list photos', e));
  }, [eventId]);

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
      setErrors((prev) => [
        ...prev,
        e instanceof Error ? e.message : String(e),
      ]);
    } finally {
      setDeletingId(null);
    }
  };

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
          {photos.map((photo) => (
            <div className="tk-photo-item" key={photo.id}>
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                className="tk-photo-thumb"
              />
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
    </div>
  );
}
