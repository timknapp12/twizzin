# Twizzin API Security Implementation

## 🔐 Authentication Overview

All critical database operations now require Supabase JWT authentication with wallet signature verification.

## 📋 API Endpoints

### **🔒 Authenticated Endpoints** (Require Bearer Token)

#### Game Operations
- `POST /api/games/create` - Create new game
- `POST /api/games/join` - Join existing game  
- `POST /api/games/submit-answers` - Submit game answers
- `POST /api/games/claim-rewards` - Claim game rewards

#### Admin Operations (Game Owner Only)
- `PUT /api/games/update` - Update game details
- `POST /api/games/update-winners` - Set game winners
- `POST /api/games/distribute-xp` - Distribute XP to players

#### User Operations
- `GET /api/user/profile` - Get user profile
- `GET /api/user/xp` - Get user XP data
- `GET /api/user/rewards` - Get user rewards data
- `GET /api/games/[gameCode]/player-data` - Get authenticated user's data for specific game

### **🌐 Public Endpoints** (Rate Limited)

#### Game Data (Read-Only)
- `GET /api/games/[gameCode]` - Get game details (60 req/min)
- `GET /api/games/[gameCode]/players` - Get game players (30 req/min)
- `GET /api/games/[gameCode]/results` - Get game results (30 req/min)
- `GET /api/games/[gameCode]/complete-results` - Get comprehensive game results (10 req/min)

## 🔑 Authentication Flow

1. **User connects wallet** → AuthModal appears
2. **User signs message** → Supabase session created with JWT
3. **Frontend gets JWT token** from session
4. **API calls include** `Authorization: Bearer <token>` header
5. **Server validates token** and extracts wallet address

## 🛡️ Security Features

### **Authentication Middleware**
- JWT token validation
- Wallet address extraction
- Error handling for invalid/expired tokens

### **Admin Authorization**
- Game ownership verification
- Admin-only operations protection
- Game state validation

### **Rate Limiting**
- IP-based rate limiting for public endpoints
- Different limits for different endpoint types
- Proper HTTP 429 responses with retry headers

### **Input Validation**
- Required field validation
- Data structure validation
- Game state checks

## 📝 Usage Examples

### Frontend Authentication
```typescript
import { authenticatedApiClient } from '@/utils/api/authenticatedClient';

// Authenticated operations
const result = await authenticatedApiClient.createGame(gameData, questions, imageFile);
const joinResult = await authenticatedApiClient.joinGame(gameCode, username);

// Public operations (no auth needed)
const gameData = await authenticatedApiClient.getGame(gameCode);
```

### Error Handling
```typescript
if (!result.success) {
  if (result.error?.includes('Authentication required')) {
    // Redirect to wallet connection
  } else if (result.error?.includes('Rate limit exceeded')) {
    // Show rate limit message
  } else {
    // Handle other errors
  }
}
```

## 🚨 Security Benefits

1. **Prevents unauthorized access** to critical operations
2. **Validates wallet ownership** through cryptographic signatures  
3. **Protects against spam** with rate limiting
4. **Maintains game integrity** with admin-only operations
5. **Follows security best practices** for Web3 applications

## ⚡ Performance Considerations

- **In-memory rate limiting** (consider Redis for production)
- **JWT validation** on every authenticated request
- **Database queries** for admin verification
- **Automatic cleanup** of expired rate limit entries

## 🔄 Migration Notes

- All existing direct database calls should be updated to use the new API routes
- Frontend components need to handle authentication errors gracefully
- Rate limiting may require adjustment based on actual usage patterns