import { useState, useEffect, useCallback } from 'react';
import { 
  getAdminOffers, 
  createAdminOffer, 
  updateAdminOffer, 
  deleteAdminOffer, 
  reorderAdminOffers,
  publishAdminOffers,
  type MarqueeOffer 
} from '../../api/admin.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Reorder, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Send,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function OfferMarqueeEditor() {
  const [offers, setOffers] = useState<MarqueeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  // Fetch all offers
  const fetchOffers = useCallback(async () => {
    try {
      const res = await getAdminOffers();
      // Ensure offers are sorted by sortOrder
      const sorted = (res.data || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
      setOffers(sorted);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Create a new offer with default values
  const handleCreate = async () => {
    const newOfferData = {
      text: 'New Offer: 50% OFF your first therapy session!',
      linkUrl: 'https://www.manas360.com/bookings',
      isActive: true,
      sortOrder: offers.length
    };

    try {
      await createAdminOffer(newOfferData);
      toast.success('New offer block added');
      fetchOffers();
    } catch (err) {
      toast.error('Failed to create offer');
    }
  };

  // Update specific fields (isActive, text, etc.)
  const handleUpdate = async (id: string, updatedData: Partial<MarqueeOffer>) => {
    try {
      await updateAdminOffer(id, updatedData);
      setOffers(prev => prev.map(o => o.id === id ? { ...o, ...updatedData } : o));
      // No toast for simple toggles unless it's a big change
    } catch (err) {
      toast.error('Update failed');
      fetchOffers(); // rollback
    }
  };

  // Delete an offer
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer? This cannot be undone.')) return;
    try {
      await deleteAdminOffer(id);
      setOffers(prev => prev.filter(o => o.id !== id));
      toast.success('Offer removed');
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  // Handle reordering completion
  const handleReorder = async (newOrder: MarqueeOffer[]) => {
    // Optimistic UI update
    setOffers(newOrder);
    try {
      await reorderAdminOffers(newOrder.map(o => o.id));
      // Silent success for better UX
    } catch (err) {
      toast.error('Failed to save new order');
      fetchOffers(); // rollback
    }
  };

  // Publish to Redis cache
  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await publishAdminOffers();
      toast.success('🚀 Published live! Updates visible on landing page cache.', {
        duration: 5000,
        icon: '✨'
      });
    } catch (err) {
      toast.error('Publishing failed');
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-400 italic">Synchronizing with CMS...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Offer Marquee Manager <Badge variant="secondary" className="text-[10px] uppercase tracking-widest font-black">CMS</Badge>
          </h1>
          <p className="text-sm text-gray-500 font-medium">Manage the scrolling announcements on the public landing page.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleCreate} variant="secondary" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <Plus className="h-4 w-4" /> Add Offer
          </Button>
          <Button 
            onClick={handlePublish} 
            disabled={isPublishing || offers.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20"
          >
            <Send className={`h-4 w-4 ${isPublishing ? 'animate-pulse' : ''}`} />
            {isPublishing ? 'Publishing...' : 'Publish to Live'}
          </Button>
        </div>
      </div>

      {/* Drag and Drop Container */}
      <Reorder.Group axis="y" values={offers} onReorder={handleReorder} className="space-y-4">
        <AnimatePresence initial={false}>
          {offers.map((offer) => (
            <Reorder.Item 
              key={offer.id} 
              value={offer}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative"
            >
              <Card className={`p-5 group transition-all border ${offer.isActive ? 'bg-white border-gray-100 hover:border-emerald-200 hover:shadow-soft-md' : 'bg-gray-50/50 border-gray-200 opacity-60'}`}>
                <div className="flex items-center gap-6">
                  {/* Drag Handle */}
                  <div className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-300 group-hover:text-gray-500">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Icon Placeholder (Rich Aesthetic) */}
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${offer.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Sparkles className="h-6 w-6" />
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                      <Input 
                        value={offer.text}
                        onChange={(e) => handleUpdate(offer.id, { text: e.target.value })}
                        className="font-bold text-gray-800 border-transparent hover:border-gray-100 focus:border-emerald-300 bg-transparent transition-all px-0 focus:px-4"
                        placeholder="Offer text content..."
                      />
                      {!offer.isActive && <Badge variant="secondary" className="text-[9px] uppercase font-black">INACTIVE</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <ExternalLink className="h-3 w-3" />
                      <input 
                        value={offer.linkUrl || ''}
                        onChange={(e) => handleUpdate(offer.id, { linkUrl: e.target.value })}
                        className="bg-transparent border-none p-0 focus:ring-0 text-blue-500 hover:underline w-full cursor-pointer"
                        placeholder="Link URL (optional)"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleUpdate(offer.id, { isActive: !offer.isActive })}
                      className={`p-2.5 rounded-xl transition-all ${offer.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      title={offer.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {offer.isActive ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                    <button 
                      onClick={() => handleDelete(offer.id)}
                      className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete Permanently"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </Card>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {offers.length === 0 && (
        <Card className="p-20 text-center border-dashed border-2 border-gray-100 flex flex-col items-center gap-4">
          <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
            <Sparkles className="h-8 w-8" />
          </div>
          <p className="text-gray-400 italic">No marketing offers configured. Click "Add Offer" to start promotion.</p>
        </Card>
      )}

      {/* Audit & Cache Hint */}
      <div className="mt-12 p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start gap-4">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Send className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-blue-900 mb-1">Architecture Note</h4>
          <p className="text-xs text-blue-700 leading-relaxed font-medium">
            Modified offers are saved to the persistent database instantly. However, the public landing page uses a high-performance <strong>Redis cache</strong>. 
            You MUST click <span className="font-bold underline">Publish to Live</span> to synchronize the cache and update the public marquee.
          </p>
        </div>
      </div>
    </div>
  );
}
