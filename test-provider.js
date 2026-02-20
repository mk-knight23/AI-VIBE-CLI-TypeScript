import { AnthropicAdapter } from './dist/providers/adapters/anthropic.adapter.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const adapter = new AnthropicAdapter();
    const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in one word.' }
    ];

    console.log('Testing chat()...');
    try {
        const response = await adapter.chat(messages);
        console.log('Chat Response:', response.content);
    } catch (e) {
        console.error('Chat Failed:', e);
    }

    console.log('\nTesting streamChat()...');
    try {
        let fullText = '';
        const stream = adapter.streamChat(messages, (chunk) => {
            fullText += chunk;
            process.stdout.write(chunk);
        });
        for await (const _ of stream) { }
        console.log('\nStream Finished. Full Text:', fullText);
    } catch (e) {
        console.error('Stream Failed:', e);
    }
}

test();
