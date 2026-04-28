'use client';
import { ChatSettings } from '@/lib/settings-service';
import { Section, Toggle, RadioGroup } from './shared';

interface Props { data: ChatSettings; onChange: (d: ChatSettings) => void; }
export default function ChatTab({ data, onChange }: Props) {
  const upd = <K extends keyof ChatSettings>(k: K, v: ChatSettings[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4">
      <Section title="Chat Systems" description="Enable or disable the two isolated chat engines.">
        <Toggle label="Booking Chat" description="Auto-generates a chat thread for every booking between client and staff." checked={data.booking_chat_enabled} onChange={v => upd('booking_chat_enabled', v)} />
        <Toggle label="Support Chat"  description="Standalone support channel separate from bookings."                     checked={data.support_chat_enabled}  onChange={v => upd('support_chat_enabled', v)} />
      </Section>

      {data.support_chat_enabled && (
        <Section title="Support Mode" description="How support conversations are organised.">
          <RadioGroup label="Support Mode" value={data.support_mode} onChange={v => upd('support_mode', v)} options={[
            { value: 'ticket_based', label: '🎫 Ticket-Based', description: 'Each issue is its own isolated ticket thread.' },
            { value: 'group_based',  label: '👥 Group-Based',  description: 'Support happens in shared group channels.' },
          ]} />
          <RadioGroup label="Assignment Mode" value={data.support_assignment_mode} onChange={v => upd('support_assignment_mode', v)} options={[
            { value: 'auto',   label: '⚡ Auto',   description: 'System auto-assigns support tickets to available staff.' },
            { value: 'manual', label: '👤 Manual', description: 'Admin manually routes tickets to staff.' },
          ]} />
        </Section>
      )}

      <Section title="Client Permissions">
        <Toggle label="Allow Client Chat Edit"       description="Clients can edit their own messages."       checked={data.allow_client_chat_edit}       onChange={v => upd('allow_client_chat_edit', v)} />
        <Toggle label="Allow Client Chat Delete"     description="Clients can delete their own messages."     checked={data.allow_client_chat_delete}     onChange={v => upd('allow_client_chat_delete', v)} />
        <Toggle label="Allow Staff Chat Moderation"  description="Staff can delete or hide any message."      checked={data.allow_staff_chat_moderation}  onChange={v => upd('allow_staff_chat_moderation', v)} />
      </Section>

      <Section title="Chat Lifecycle">
        <RadioGroup label="Chat Close Behavior" value={data.chat_close_behavior} onChange={v => upd('chat_close_behavior', v)} options={[
          { value: 'archived_readonly', label: '📦 Archived (Read-Only)', description: 'Closed chats are preserved but no new messages allowed. Recommended.' },
          { value: 'deleted',           label: '🗑️ Deleted',              description: 'Closed chats are permanently removed. Not recommended.' },
        ]} />
      </Section>
    </div>
  );
}
