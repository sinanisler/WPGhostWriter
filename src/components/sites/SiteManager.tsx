import { useState, useEffect } from 'react';
import { useSiteStore } from '../../stores/siteStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SiteConnectionForm } from './SiteConnectionForm';
import { useToast } from '../ui/Toast';
import * as api from '../../lib/tauri';

export function SiteManager() {
  const { sites, fetchSites, removeSite } = useSiteStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editSite, setEditSite] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSites();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSite(id);
      removeSite(id);
      toast('Site removed', 'success');
    } catch (e) {
      toast(`Delete failed: ${e}`, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500 mt-0.5">
            Manage your WordPress sites. App Password auth required.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>+ Add Site</Button>
      </div>

      {sites.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-10 text-center">
          <p className="text-neutral-400 text-sm mb-1">No sites connected yet</p>
          <p className="text-neutral-600 text-xs mb-4">Add a WordPress site to start automating content</p>
          <Button size="sm" onClick={() => setAddOpen(true)}>Add Your First Site</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <div key={site.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-neutral-200 text-sm truncate">{site.name}</span>
                </div>
                <span className="text-xs text-neutral-500 truncate block">{site.url}</span>
                <span className="text-xs text-neutral-600">User: {site.username}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditSite(site.id)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setDeletingId(site.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add WordPress Site" size="md">
        <SiteConnectionForm onSuccess={() => { setAddOpen(false); fetchSites(); }} onCancel={() => setAddOpen(false)} />
      </Modal>

      {/* Edit modal */}
      {editSite && (
        <Modal open={!!editSite} onClose={() => setEditSite(null)} title="Edit Site" size="md">
          <SiteConnectionForm
            siteId={editSite}
            onSuccess={() => { setEditSite(null); fetchSites(); }}
            onCancel={() => setEditSite(null)}
          />
        </Modal>
      )}

      {/* Delete confirm */}
      <Modal open={!!deletingId} onClose={() => setDeletingId(null)} title="Delete Site?" size="sm">
        <p className="text-sm text-neutral-400 mb-5">
          This will remove the site and cannot be undone. Tasks that used this site will remain but cannot be restarted.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deletingId && handleDelete(deletingId)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
