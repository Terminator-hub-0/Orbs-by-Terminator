TALKING ORBS (Blu & Blaze) - by Terminator Hub - MIT License

START HERE
1. Double-click index.html. You will see the two orbs. Tap one to chat.

USE ON YOUR OWN WEBSITE
Upload orbs.js next to your page and add this before </body>:
  <script src="orbs.js" data-ai-url="" data-orbs="both"></script>
  <script>Orbs.onAsk=function(q){return "your answer"}</script>
To connect a real AI, put your endpoint in data-ai-url.
It receives POST {q, lang, bot, hist} and must return {"answer":"..."}.

USE ON BLOGGER (easiest): paste-in code
Open blogger/blogger-orbs-snippet.html, copy ALL of it, then in Blogger:
  Layout > Add a Gadget > HTML/JavaScript > paste > Save
  (or Theme > Edit HTML > paste just before the </body> line > Save)
The orbs read your real blog posts automatically. No article list to type.

USE ON BLOGGER (full theme): blogger/theme-talking-orbs.xml
Theme > arrow next to Customize > Restore > upload it. Back up your current theme first.

OPTIONAL: LEARNING + AI (folder "server")
Free Cloudflare Worker that stores what the orbs learn (opt-in only) and can use real AI.
  cd server
  npx wrangler kv namespace create ORBS     (paste the id into wrangler.toml)
  npx wrangler secret put ADMIN_KEY
  npx wrangler deploy
Then set AI_URL and LOG_URL in the Blogger theme (or data-ai-url in orbs.js) to your worker URL.
To enable real AI answers, uncomment [ai] in wrangler.toml.

KEEP THE CREDIT
Keep LICENSE, NOTICE, the header in orbs.js, and the "Orbs by Terminator Hub" link in the chat box.
