import { useState, useEffect } from 'react';
import { getAdminFeedback, resolveAdminFeedback, FeedbackItem } from '../../api/admin.api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function Feedback() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await getAdminFeedback();
      if (response.success) {
        setFeedback(response.data.feedback);
      } else {
        toast.error(response.message || 'Failed to fetch feedback');
      }
    } catch (error) {
      toast.error('Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const markResolved = async (id: string) => {
    try {
      const response = await resolveAdminFeedback(id);
      if (response.success) {
        toast.success('Feedback marked as resolved');
        fetchFeedback();
      } else {
        toast.error(response.message || 'Failed to resolve feedback');
      }
    } catch (error) {
      toast.error('Failed to resolve feedback');
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'negative': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Feedback & Sentiment
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time voice of the user and platform health signals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : feedback.length === 0 ? (
          <Card className="p-12 text-center bg-white/5 border-white/10 backdrop-blur-xl">
             <p className="text-muted-foreground">No feedback reported yet.</p>
          </Card>
        ) : (
          feedback.map((item) => (
            <Card key={item.id} className="p-6 bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/[0.07] transition-all group relative overflow-hidden">
               <div className={`absolute top-0 left-0 w-1 h-full ${
                 item.sentiment === 'positive' ? 'bg-emerald-500' : 
                 item.sentiment === 'negative' ? 'bg-rose-500' : 'bg-amber-500'
               }`} />
               
               <div className="flex justify-between items-start">
                 <div className="space-y-1">
                   <div className="flex items-center gap-3">
                     <span className="font-semibold text-lg">{item.userName}</span>
                     <Badge variant="soft" className={getSentimentColor(item.sentiment)}>
                       {item.sentiment.toUpperCase()}
                     </Badge>
                     {item.resolved && (
                       <Badge variant="secondary" className="bg-white/10 text-white/60 border-none">
                         RESOLVED
                       </Badge>
                     )}
                   </div>
                   <div className="flex items-center gap-1 text-amber-400">
                     {[...Array(5)].map((_, i) => (
                       <span key={i} className={i < item.rating ? 'text-amber-400' : 'text-white/10'}>★</span>
                     ))}
                     <span className="text-sm text-muted-foreground ml-2">({item.rating}/5)</span>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-muted-foreground">
                     {new Date(item.createdAt).toLocaleString()}
                   </p>
                 </div>
               </div>

               <div className="mt-4 text-white/80 leading-relaxed bg-white/5 p-4 rounded-lg border border-white/5 whitespace-pre-wrap">
                 "{item.comment}"
               </div>

               {!item.resolved && (
                 <div className="mt-4 flex justify-end">
                   <Button 
                     size="sm" 
                     variant="soft" 
                     className="bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary border"
                     onClick={() => markResolved(item.id)}
                   >
                     Mark as Resolved
                   </Button>
                 </div>
               )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
