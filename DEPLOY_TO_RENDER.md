# Deploy AI Agent to Render (Free)

## Quick Setup

1. **Create Render Account**: Go to [render.com](https://render.com) and sign up for free

2. **Connect Your Repository**: 
   - Push this code to GitHub/GitLab
   - Connect your repository to Render

3. **Deploy with Blueprint**:
   - In Render dashboard, click "New" → "Blueprint"
   - Point to your repository
   - Render will automatically detect the `render.yaml` file
   - Click "Apply" to deploy both database and web service

## What Gets Deployed

- **PostgreSQL Database** (Free tier: 90 days, then $7/month)
- **Web Service** (Free tier: 750 hours/month)
- **AI Models**: FLAN-T5, BlenderBot, DistilBERT
- **RAG System**: Vector search with document indexing

## Free Tier Limits

- **Web Service**: 750 hours/month (enough for moderate usage)
- **Database**: Free for 90 days, then $7/month
- **Memory**: 512MB RAM (sufficient for your models)
- **Sleep**: Service sleeps after 15 minutes of inactivity

## Alternative: Manual Setup

If blueprint doesn't work:

1. **Create PostgreSQL Database**:
   - New → PostgreSQL
   - Name: `ai-agent-db`
   - Plan: Free

2. **Create Web Service**:
   - New → Web Service
   - Connect repository
   - Build Command: `npm ci && ./build.sh`
   - Start Command: `npm start`
   - Add environment variable: `DATABASE_URL` (from database)

## Post-Deployment

- Your app will be available at: `https://your-app-name.onrender.com`
- First startup takes 2-3 minutes (downloading AI models)
- Subsequent requests are faster (models cached)

## Cost Optimization

- Database will be free for 90 days
- After that, consider upgrading to paid plan ($7/month) or migrate to free alternatives like PlanetScale
- Web service stays free with 750 hours/month