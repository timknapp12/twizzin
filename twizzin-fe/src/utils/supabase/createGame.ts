import { supabase } from './supabaseClient';
import { processImageFile } from './imageProcessing';
import { QuestionForDb, GameInputForDb } from '@/types';
import { ensurePlayerExists } from './playerManagement';

type VerificationFunction = <T>(_operation: () => Promise<T>, _errorMessage?: string) => Promise<T | null>;

// Function to handle image upload
export const uploadGameImage = async (imageFile: File, withVerification: VerificationFunction) => {
  return withVerification(async () => {
    try {
      const processedFile = await processImageFile(imageFile);

      const safeFileName = `${Date.now()}-${imageFile.name
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '-')}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('game-images')
        .upload(safeFileName, processedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: imageFile.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('game-images').getPublicUrl(uploadData.path);

      return { publicUrl, fileName: safeFileName };
    } catch (error) {
      throw error;
    }
  });
};

// Function to delete an image from storage
export const deleteGameImage = async (fileName: string, withVerification: VerificationFunction) => {
  return withVerification(async () => {
    try {
      const { error } = await supabase.storage
        .from('game-images')
        .remove([fileName]);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  });
};

// Function to create a new game
export const createGameInDb = async (
  gameData: GameInputForDb,
  questions: QuestionForDb[],
  withVerification: VerificationFunction
) => {
  return withVerification(async () => {
    try {
      if (!gameData.adminWallet) {
        throw new Error('Admin wallet address is required');
      }

      await ensurePlayerExists(
        gameData.adminWallet,
        withVerification,
        gameData.username
      );

      const { username: _username, ...gameDataWithoutUsername } = gameData;

      const dbGameData = {
        game_pubkey: gameDataWithoutUsername.gamePubkey,
        admin_wallet: gameDataWithoutUsername.adminWallet,
        name: gameDataWithoutUsername.name,
        token_mint: gameDataWithoutUsername.tokenMint,
        entry_fee: gameDataWithoutUsername.entryFee,
        commission_bps: gameDataWithoutUsername.commissionBps,
        start_time: gameDataWithoutUsername.startTime,
        end_time: gameDataWithoutUsername.endTime,
        max_winners: gameDataWithoutUsername.maxWinners,
        donation_amount: gameDataWithoutUsername.donationAmount,
        is_native: gameDataWithoutUsername.isNative,
        all_are_winners: gameDataWithoutUsername.allAreWinners,
        even_split: gameDataWithoutUsername.evenSplit,
        answer_merkle_root: gameDataWithoutUsername.answerMerkleRoot,
        img_url: gameDataWithoutUsername.imgUrl
      };

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert([dbGameData])
        .select()
        .single();

      if (gameError) {
        throw gameError;
      }

      const questionsWithGameId = questions.map(({ answers: _answers, ...q }) => ({
        game_id: game.id,
        question_text: q.questionText,
        display_order: q.displayOrder,
        correct_answer: q.correctAnswer,
        time_limit: q.timeLimit
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsWithGameId);

      if (questionsError) {
        throw questionsError;
      }

      // Fetch the created questions
      const { data: createdQuestions, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .eq('game_id', game.id);

      if (fetchError) {
        throw fetchError;
      }

      return {
        game,
        questions: createdQuestions
      };
    } catch (error) {
      throw error;
    }
  });
};
