/**
 * Session Commands - Multi-session management
 */

import { sessionManager, Session } from '../core/sessions-v2';
import { privacyManager } from '../core/privacy';

export function sessionsCommand(action?: string, arg?: string): void {
  switch (action) {
    case 'new':
      const session = sessionManager.create(arg);
      console.log(`\n✨ Created session: ${session.name}`);
      console.log(`   ID: ${session.id}`);
      break;

    case 'list':
    case undefined:
      const sessions = sessionManager.list();
      if (sessions.length === 0) {
        console.log('\nNo sessions found. Start one with: vibe sessions new');
        return;
      }
      console.log('\n📋 Sessions:\n');
      for (const s of sessions.slice(0, 10)) {
        const current = sessionManager.getCurrent() === s.id ? '→' : ' ';
        const age = getRelativeTime(s.updated);
        console.log(`${current} ${s.name.padEnd(20)} ${s.messageCount.toString().padStart(3)} msgs  ${age}`);
      }
      break;

    case 'switch':
      if (!arg) {
        console.log('Usage: vibe sessions switch <id|name>');
        return;
      }
      const found = sessionManager.list().find(s => s.id === arg || s.name === arg);
      if (found) {
        sessionManager.setCurrent(found.id);
        console.log(`\n✅ Switched to: ${found.name}`);
      } else {
        console.log(`\n❌ Session not found: ${arg}`);
      }
      break;

    case 'delete':
      if (!arg) {
        console.log('Usage: vibe sessions delete <id>');
        return;
      }
      if (sessionManager.delete(arg)) {
        console.log(`\n✅ Deleted session: ${arg}`);
      } else {
        console.log(`\n❌ Session not found: ${arg}`);
      }
      break;

    case 'share':
      if (!privacyManager.canShare()) {
        console.log('\n⚠️  Sharing disabled. Enable with: vibe privacy --allow-share');
        return;
      }
      const shareId = arg || sessionManager.getCurrent();
      if (!shareId) {
        console.log('Usage: vibe sessions share <id>');
        return;
      }
      const link = sessionManager.createShareLink(shareId);
      if (link) {
        console.log(`\n🔗 Share link: ${link}`);
        console.log('   Anyone with this link can view the session.');
      }
      break;

    default:
      console.log(`
Usage: vibe sessions [command]

Commands:
  list              List all sessions
  new [name]        Create new session
  switch <id>       Switch to session
  delete <id>       Delete session
  share <id>        Create share link
`);
  }
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
