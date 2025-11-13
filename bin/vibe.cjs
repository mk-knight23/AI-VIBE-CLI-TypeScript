#!/usr/bin/env node
/* Vibe Code CLI v2 command router */
const { chatCompletion, getModelDefaults, loadConfig, saveConfig, encodeImageToDataUrl, listTopFreeModels } = require('../lib/openrouter.cjs');
const { plan, fix, saveSession, loadLatestSession, startWatcher } = require('../lib/agent.cjs');
const path = require('path');
const fs = require('fs');
const pc = require('picocolors');
const simpleGit = require('simple-git');

function printUsage() {
  console.log(`Vibe Code CLI v2\nCommands:\n  vibe plan "task"\n  vibe fix\n  vibe run [--yolo]\n  vibe model list | use <id>\n  vibe theme set <dark|light>\n  vibe cost\n  vibe resume\n  vibe view <image>\n  vibe test\n  vibe commit\n  vibe explain  (reads stdin: git status | vibe explain)\n  vibe agent start [--watch <paths>]\n  vibe plugin install <name>\n  vibe tui  (preview)\n  vibe chat`);
}

async function main(argv) {
  const cmd = argv[2];
  const args = argv.slice(3);
  const cfg = loadConfig();
  if (!cfg.openrouter) cfg.openrouter = { defaultModel: 'z-ai/glm-4.5-air:free', topFreeModels: TOP_FREE_MODELS };
  if (!cfg.core) cfg.core = { theme: 'dark', autonomous: false, rateLimitBackoff: 5000 };

  switch (cmd) {
    case 'plan': {
      const task = args.join(' ').trim().replace(/^"|"$/g, '') || 'setup task';
      const out = await plan(task);
      console.log(out);
      saveSession('latest', { type: 'plan', task, out });
      break;
    }
    case 'fix': {
      const out = await fix('Analyze repo and propose diffs for failing tests.');
      console.log(out);
      saveSession('latest', { type: 'fix', out });
      break;
    }
    case 'run': {
      const yolo = args.includes('--yolo');
      const res = await require('../lib/agent.cjs').runAutonomous({ yolo });
      console.log(pc.gray(`Run status: ${res.status}`));
      break;
    }
    case 'model': {
      const sub = args[0];
      if (sub === 'list') {
        const { defaultModel, models } = listTopFreeModels();
        console.log('Default:', defaultModel);
        models.forEach((m,i)=>{
          const mark = m.id===defaultModel? '*':' ';
          const info = m.ctx? ` (${m.ctx.toLocaleString()} ctx)` : '';
          console.log(`${mark} ${i+1}. ${m.id}${info}${m.note? ' - '+m.note:''}`);
        });
      } else if (sub === 'use') {
        const id = args[1];
        if (!id) return console.log('Usage: vibe model use <modelId>');
        const { models } = listTopFreeModels();
        const valid = models.some(m=>m.id===id);
        if (!valid) {
          console.log('Invalid model. Use `vibe model list` to see allowed free models.');
          return;
        }
        cfg.openrouter.defaultModel = id;
        saveConfig(cfg);
        console.log(pc.green(`Default model set to ${id}`));
      } else {
        console.log('Usage: vibe model list | use <id>');
      }
      break;
    }
    case 'theme': {
      if (args[0] === 'set' && (args[1] === 'dark' || args[1] === 'light')) {
        cfg.core.theme = args[1];
        saveConfig(cfg);
        console.log(pc.green(`Theme set to ${args[1]}`));
      } else {
        console.log('Usage: vibe theme set <dark|light>');
      }
      break;
    }
    case 'cost': {
      const sess = loadLatestSession();
      console.log('Cost (free tier): model rotations tracked in sessions. Latest:', sess ? (sess.model || 'n/a') : 'n/a');
      break;
    }
    case 'resume': {
      const sess = loadLatestSession();
      if (!sess) return console.log('No session to resume');
      console.log('Resuming session:', sess.type);
      break;
    }
    case 'view': {
      const img = args[0];
      if (!img) return console.log('Usage: vibe view <image>');
      const url = encodeImageToDataUrl(img);
      const { defaultModel } = getModelDefaults();
      const messages = [
        { role: 'user', content: [ { type: 'text', text: 'Analyze this UI and suggest fixes.' }, { type: 'image_url', image_url: { url } } ] }
      ];
      chatCompletion({ model: 'google/gemini-2.0-flash-exp:free', messages }).then(r=>{
        console.log(r.message?.content || '');
      }).catch(e=>console.error(e.message));
      break;
    }
    case 'test': {
      // Detect test runner
      const pkg = (()=>{ try { return require('../package.json'); } catch { return {}; } })();
      const has = (bin) => require('fs').existsSync(require('path').join(process.cwd(), 'node_modules/.bin/', bin));
      const { spawn } = require('child_process');
      const run = (cmd, args) => new Promise((res)=>{ const p=spawn(cmd,args,{stdio:'inherit'}); p.on('close',c=>res(c)); });
      (async ()=>{
        if (has('jest') || (pkg.devDependencies && pkg.devDependencies.jest) || (pkg.dependencies && pkg.dependencies.jest)) {
          process.exitCode = await run('npx', ['-y','jest']);
        } else if (has('vitest') || (pkg.devDependencies && pkg.devDependencies.vitest)) {
          process.exitCode = await run('npx', ['-y','vitest','run']);
        } else if (has('mocha') || (pkg.devDependencies && pkg.devDependencies.mocha)) {
          process.exitCode = await run('npx', ['-y','mocha']);
        } else {
          console.log('No known JS test runner detected.');
          process.exitCode = 0;
        }
      })();
      break;
    }
    case 'explain': {
      // Pipe support: read from stdin if available
      const { stdin } = process;
      let data = '';
      if (!stdin.isTTY) {
        await new Promise((resolve) => {
          stdin.setEncoding('utf8');
          stdin.on('data', chunk => data += chunk);
          stdin.on('end', resolve);
        });
      }
      const text = data || args.join(' ');
      if (!text) return console.log('Usage: <input> | vibe explain OR vibe explain "text"');
      const messages = [ { role: 'user', content: 'Explain the following output succinctly and propose next steps:\n\n' + text } ];
      chatCompletion({ model: 'z-ai/glm-4.5-air:free', messages }).then(r=>{
        console.log(r.message?.content || '');
      }).catch(e=>console.error('Explain error:', e.message));
      break;
    }
    case 'commit': {
      const git = simpleGit();
      git.status().then(async (st) => {
        if (st.staged.length === 0 && st.modified.length === 0) {
          console.log('Nothing to commit');
          return;
        }
        await git.add('.');
        // Generate AI message from diff
        let diff = '';
        try { diff = await git.diff(['--staged']); } catch {}
        let msg = 'chore: update via Vibe CLI';
        try {
          const prompt = [
            { role: 'system', content: 'You are an expert software dev that writes concise, conventional commit messages.' },
            { role: 'user', content: `Write a one-line conventional commit message for these staged changes. No trailing period.\n\n${diff.slice(0, 4000)}` }
          ];
          const r = await chatCompletion({ model: 'kwaipilot/kat-coder-pro-v1:free', messages: prompt });
          msg = (r.message?.content || msg).split('\n')[0].trim();
        } catch (e) {}
        await git.commit(msg);
        console.log(pc.green('Committed: ' + msg));
      }).catch(e => console.error('Git error:', e.message));
      break;
    }
    case 'agent': {
      if (args[0] === 'start') {
        const watchIdx = args.indexOf('--watch');
        const paths = watchIdx >= 0 ? args[watchIdx+1].split(',') : (loadConfig()?.agents?.watch || ['src/','tests/']);
        console.log('Agent watching:', paths.join(', '));
        startWatcher(paths, (ev, p) => {
          console.log(pc.gray(`Changed [${ev}]: ${p} -> TODO lint/test/auto-fix`));
        });
      } else {
        console.log('Usage: vibe agent start [--watch <paths>]');
      }
      break;
    }
    case 'plugin': {
      if (args[0] === 'install') {
        const name = args[1];
        if (!name) return console.log('Usage: vibe plugin install <name>');
        const dir = path.join(process.cwd(), 'plugins');
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
        const file = path.join(dir, `${name}.js`);
        if (!fs.existsSync(file)) fs.writeFileSync(file, `module.exports = async function ${name}(input){\n  // TODO: implement plugin\n  return input;\n};\n`, 'utf8');
        console.log(pc.green(`Installed plugin: ${file}`));
      } else {
        console.log('Usage: vibe plugin install <name>');
      }
      break;
    }
    case 'config': {
      const sub = args[0];
      const keyPath = args[1];
      const value = args[2];
      const cfgRef = cfg;
      const getByPath = (obj, p) => p.split('.').reduce((o,k)=> (o||{})[k], obj);
      const setByPath = (obj, p, val) => { const ks=p.split('.'); let cur=obj; ks.forEach((k,i)=>{ if(i===ks.length-1){ cur[k]=val; } else { cur[k]=cur[k]||{}; cur=cur[k]; } }); };
      if (sub === 'get') {
        if (!keyPath) return console.log('Usage: vibe config get <path>');
        console.log(getByPath(cfgRef, keyPath));
      } else if (sub === 'set') {
        if (!keyPath) return console.log('Usage: vibe config set <path> <value>');
        setByPath(cfgRef, keyPath, value);
        saveConfig(cfgRef);
        console.log(pc.green(`Set ${keyPath}`));
      } else {
        console.log('Usage: vibe config get|set <path> [value]');
      }
      break;
    }
    case 'chat': {
      const text = args.join(' ').trim();
      const { defaultModel } = getModelDefaults();
      if (text) {
        const messages = [ { role: 'user', content: text } ];
        chatCompletion({ model: defaultModel, messages }).then(r=>{
          console.log(r.message?.content || '');
        }).catch(e=>console.error('Chat error:', e.message));
      } else {
        console.log('Tip: pass a message, e.g., vibe chat "Hello"');
      }
      break;
    }
    default:
      printUsage();
      break;
  }
}

main(process.argv).catch(e=>{ console.error(e); process.exit(1); });
