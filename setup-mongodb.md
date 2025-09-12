# MongoDB Atlas Setup Guide

## Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new project (e.g., "Heartland Care Compass")

## Step 2: Create a Cluster
1. Click "Build a Database"
2. Choose "M0 Sandbox" (Free tier)
3. Select your preferred cloud provider and region
4. Name your cluster (e.g., "heartland-cluster")
5. Click "Create Cluster"

## Step 3: Create Database User
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and strong password
5. Set database user privileges to "Read and write to any database"
6. Click "Add User"

## Step 4: Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development, you can click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production, add only your specific IP addresses
5. Click "Confirm"

## Step 5: Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "4.1 or later"
5. Copy the connection string

## Step 6: Update .env File
Replace the placeholder in your `.env` file:

```env
# Replace these values with your actual MongoDB Atlas credentials:
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/heartlandCareCompass?retryWrites=true&w=majority
MONGODB_DB_NAME=heartlandCareCompass
```

### Example:
If your username is `admin`, password is `mypassword123`, and cluster is `cluster0.abc123.mongodb.net`:

```env
MONGODB_URI=mongodb+srv://admin:mypassword123@cluster0.abc123.mongodb.net/heartlandCareCompass?retryWrites=true&w=majority
MONGODB_DB_NAME=heartlandCareCompass
```

## Step 7: Test Connection
1. Save your `.env` file
2. Restart your application: `npm run dev`
3. Check the console for "✅ Connected to MongoDB Atlas"

## Database Collections
The application will automatically create these collections when data is first saved:
- `youth` - Youth profiles and information
- `behaviorPoints` - Daily behavior point records
- `progressNotes` - Progress notes and case documentation
- `dailyRatings` - Daily performance ratings (DPN)
- `assessments` - Assessment data

## Security Notes
- Never commit your `.env` file to version control
- Use strong passwords for database users
- Restrict IP access in production environments
- Consider using MongoDB's built-in encryption features for sensitive data

## Troubleshooting
- **Connection timeout**: Check your network access settings
- **Authentication failed**: Verify username/password in connection string
- **Database not found**: The database will be created automatically when first used
- **IP not whitelisted**: Add your IP address to Network Access

## Local MongoDB Alternative
If you prefer to use local MongoDB instead of Atlas:

1. Install MongoDB locally
2. Start MongoDB service
3. Update `.env` file:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/heartlandCareCompass
MONGODB_DB_NAME=heartlandCareCompass
```