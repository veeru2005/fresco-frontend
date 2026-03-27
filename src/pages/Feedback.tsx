import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
import { Send } from 'lucide-react';


const Feedback = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedFeedbacks = localStorage.getItem('fresco_feedbacks');
    if (storedFeedbacks) {
      setFeedbacks(JSON.parse(storedFeedbacks));
    } else {
      setFeedbacks([]);
      localStorage.setItem('fresco_feedbacks', JSON.stringify([]));
    }
  }, []);

  useEffect(() => {
    setName(user?.username || '');
    setEmail(user?.email || '');
  }, [user?.username, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !subject.trim() || !description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), description: description.trim() })
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Server error');
      }

      const data = await res.json();
      const newFeedback = {
        id: data.id || `f${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        description: description.trim(),
        date: new Date().toISOString(),
      };

      const updatedFeedbacks = [newFeedback, ...feedbacks];
      setFeedbacks(updatedFeedbacks);
      localStorage.setItem('fresco_feedbacks', JSON.stringify(updatedFeedbacks));

      toast({
        title: 'Thank You!',
        description: 'Your feedback has been submitted successfully.',
        variant: 'success',
      });

      setName(user?.username || '');
      setEmail(user?.email || '');
      setSubject('');
      setDescription('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to submit feedback', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-6 sm:py-16 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
      <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Share Your Experience</h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            We value your feedback and strive to improve our services
          </p>
        </div>

        {/* Feedback Form */}
        <Card className="p-6 sm:p-8 mb-10 border-2 border-[#255c45]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Feedback subject" required />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your experience..."
                rows={6}
                className="resize-none"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-hero hover:opacity-90"
              disabled={loading}
            >
              {loading ? 'Submitting...' : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Removed previous Customer Reviews listing per request */}
      </div>
    </div>
  );
};

export default Feedback;
