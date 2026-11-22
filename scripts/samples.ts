export const chats: Record<string, string> = {
  login: `User: make a login page
AI: Here's a basic login page with email and password fields...
User: it doesn't work
AI: Could you share the error you're seeing?
User: it just says error. fix it
AI: Without more detail I'm guessing, but here is a revised handler...
User: still broken. also add the dashboard and the settings and user profiles and make it look nice`,
  todo: `User: build me a todo app
AI: Sure! Which stack would you like?
User: whatever is best
AI: I'll use React and a small Express server...
User: the todos disappear when I refresh
AI: They are stored in memory. You need persistence.
User: ok make it save. and make it faster, it feels slow`,
  deploy: `User: deploy my site
AI: Where would you like to deploy it?
User: the internet
AI: Do you have a hosting provider in mind (Vercel, Netlify, Cloudflare)?
User: idk just do it. it says 500 on the live site but works on my laptop
AI: A 500 usually means a server-side error. Can you share the logs?
User: no. just fix the 500`,
};
