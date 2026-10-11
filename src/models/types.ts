export interface Profile { id: string; display_name: string; city: string | null }
export interface Friendship { id: string; requester_id: string; addressee_id: string; status: 'pending'|'accepted'|'blocked' }
export interface Postcard { id: string; sender_id: string; recipient_id: string; title: string; body: string; city: string; source_path: string; status: 'sent'|'opened'; created_at: string; opened_at: string | null }
export interface CardInput { recipientId: string; title: string; body: string; city: string; file: File }

