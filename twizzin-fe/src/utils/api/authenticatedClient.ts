import { supabase } from '@/utils/supabase/supabaseClient';

export class AuthenticatedApiClient {
  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      

      
      if (error || !session?.access_token) {
        console.error('No valid session found:', error);
        return null;
      }
      
      return session.access_token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async makeAuthenticatedRequest<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<{
    success: boolean;
    data?: T;
    error?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          error: 'Authentication required. Please sign in with your wallet.',
        };
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: responseData.data || responseData,
      };
    } catch (error: any) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  async createGame(gameData: any, questions: any[], imageFile?: File): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    let imageBase64: string | undefined;
    
    if (imageFile) {
      try {
        imageBase64 = await this.fileToBase64(imageFile);
      } catch (error) {
        return {
          success: false,
          error: 'Failed to process image file',
        };
      }
    }

    return this.makeAuthenticatedRequest('/api/games/create', {
      method: 'POST',
      body: JSON.stringify({
        gameData,
        questions,
        imageFile: imageBase64,
      }),
    });
  }

  async joinGame(gameCode: string, username?: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/join', {
      method: 'POST',
      body: JSON.stringify({
        gameCode,
        username,
      }),
    });
  }

  async verifyAnswers(
    gameCode: string,
    answers: Array<{ displayOrder: number; answer: string; questionId: string }>,
    finishTime: number
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/verify-answers', {
      method: 'POST',
      body: JSON.stringify({ gameCode, answers, finishTime }),
    });
  }

  async submitAnswers(
    gameCode: string,
    gameSession: any,
    signature: string,
    numCorrect: number
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/submit-answers', {
      method: 'POST',
      body: JSON.stringify({
        gameCode,
        gameSession,
        signature,
        numCorrect,
      }),
    });
  }

  async claimRewards(gameId: string, txSignature: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/claim-rewards', {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        txSignature,
      }),
    });
  }

  async updateGame(
    gameId: string,
    gameData: any,
    questions: any[],
    imageFile?: File
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    let imageBase64: string | undefined;
    
    if (imageFile) {
      try {
        imageBase64 = await this.fileToBase64(imageFile);
      } catch (error) {
        return {
          success: false,
          error: 'Failed to process image file',
        };
      }
    }

    return this.makeAuthenticatedRequest('/api/games/update', {
      method: 'PUT',
      body: JSON.stringify({
        gameId,
        gameData,
        questions,
        imageFile: imageBase64,
      }),
    });
  }

  async updateWinners(gameId: string, winners: any[]): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/update-winners', {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        winners,
      }),
    });
  }

  // Public API methods (rate-limited, no auth required)
  async getGame(gameCode: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${gameCode}`);
      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: responseData.data || responseData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  async getGamePlayers(gameCode: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${gameCode}/players`);
      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: responseData.data || responseData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  async getGameResults(gameCode: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${gameCode}/results`);
      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: responseData.data || responseData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  // Admin-only methods
  async distributeXP(
    gameId: string,
    players: any[],
    isEvenSplit: boolean,
    playerLength: number,
    config?: any
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/distribute-xp', {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        players,
        isEvenSplit,
        playerLength,
        config,
      }),
    });
  }

  // Authenticated user methods
  async getUserRewards(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/user/rewards');
  }

  async getUserXP(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/user/xp');
  }

  async getPlayerDataForGame(gameCode: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest(`/api/games/${gameCode}/player-data`);
  }

  // Public methods (rate-limited)
  async getCompleteGameResults(gameCode: string, playerWallet?: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const url = playerWallet 
        ? `/api/games/${gameCode}/complete-results?playerWallet=${playerWallet}`
        : `/api/games/${gameCode}/complete-results`;
      
      const response = await fetch(url);
      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: responseData.data || responseData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  // Admin-only: Get game data by ID
  async getGameById(gameId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/by-id', {
      method: 'POST',
      body: JSON.stringify({ gameId }),
    });
  }

  // Admin-only: Update game status to 'ended'
  async endGameStatus(gameId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/end-game-status', {
      method: 'POST',
      body: JSON.stringify({ gameId }),
    });
  }

  // Admin-only: Get game submissions and determine winners/leaderboard
  async getGameSubmissions(
    gameId: string,
    maxWinners: number,
    allAreWinners: boolean
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/game-submissions', {
      method: 'POST',
      body: JSON.stringify({ gameId, maxWinners, allAreWinners }),
    });
  }

  // Admin-only: Get admin results (game data + leaderboard)
  async getAdminResults(gameId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/admin-results', {
      method: 'POST',
      body: JSON.stringify({ gameId }),
    });
  }

  // Admin-only: Update on-chain info (game_pubkey, answer_merkle_root)
  async updateOnchainInfo(
    gameId: string,
    gamePubkey: string,
    answerMerkleRoot: number[] | string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/update-onchain-info', {
      method: 'POST',
      body: JSON.stringify({ gameId, gamePubkey, answerMerkleRoot }),
    });
  }

  // Authenticated: Get creator's games
  async getCreatorGames(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return this.makeAuthenticatedRequest('/api/games/creator');
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  }
}

// Export a singleton instance
export const authenticatedApiClient = new AuthenticatedApiClient();