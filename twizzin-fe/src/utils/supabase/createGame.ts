import { supabase } from './supabaseClient';
import { processImageFile } from './imageProcessing';
import { QuestionForDb, GameInputForDb } from '@/types';

// Function to handle image upload
export const uploadGameImage = async (imageFile: File) => {
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
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('game-images').getPublicUrl(uploadData.path);

    return { publicUrl, fileName: safeFileName };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Function to delete an image if transaction fails
export const deleteGameImage = async (fileName: string) => {
  try {
    const { error } = await supabase.storage
      .from('game-images')
      .remove([fileName]);

    if (error) console.error('Error deleting image:', error);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};

// Function to create or get player
const ensurePlayerExists = async (walletAddress: string, username?: string) => {
  try {
    // First try to get existing player
    const { data: existingPlayer } = await supabase
      .from('players')
      .select()
      .eq('wallet_address', walletAddress)
      .single();

    if (existingPlayer) {
      // If player exists but username is provided and different from current one,
      // update the username
      if (username && existingPlayer.username !== username) {
        const { data: updatedPlayer, error: updateError } = await supabase
          .from('players')
          .update({ username })
          .eq('wallet_address', walletAddress)
          .select()
          .single();

        if (updateError) throw updateError;
        return updatedPlayer;
      }

      return existingPlayer;
    }

    // If player doesn't exist, create them with the username if provided
    const playerData: { wallet_address: string; username?: string } = {
      wallet_address: walletAddress,
    };

    // Add username to player data if provided
    if (username) {
      playerData.username = username;
    }

    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert([playerData])
      .select()
      .single();

    if (error) throw error;
    return newPlayer;
  } catch (error) {
    console.error('Error ensuring player exists:', error);
    throw error;
  }
};

// Function to create a new game
const createGame = async (gameData: GameInputForDb) => {
  try {
    // Ensure player exists before creating game
    await ensurePlayerExists(gameData.adminWallet, gameData.username);

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert([
        {
          game_pubkey: gameData.gamePubkey,
          admin_wallet: gameData.adminWallet,
          name: gameData.name,
          token_mint: gameData.tokenMint,
          entry_fee: gameData.entryFee,
          commission_bps: gameData.commissionBps,
          start_time: gameData.startTime,
          end_time: gameData.endTime,
          max_winners: gameData.maxWinners,
          donation_amount: gameData.donationAmount,
          is_native: gameData.isNative,
          all_are_winners: gameData.allAreWinners,
          even_split: gameData.evenSplit,
          answer_merkle_root: gameData.answerMerkleRoot,
          img_url: gameData.imgUrl,
        },
      ])
      .select()
      .single();

    if (gameError) throw gameError;
    return game;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
};

// Function to create questions and answers for a game
const createQuestionsAndAnswers = async (
  gameId: string,
  questions: QuestionForDb[]
) => {
  try {
    // Create questions first with time_limit
    const { data: createdQuestions, error: questionsError } = await supabase
      .from('questions')
      .insert(
        questions.map((q) => ({
          game_id: gameId,
          question_text: q.questionText,
          display_order: q.displayOrder,
          correct_answer: q.correctAnswer,
          time_limit: q.timeLimit,
        }))
      )
      .select();

    if (questionsError) throw questionsError;

    // Create answers for each question with new fields
    const answersToInsert = createdQuestions.flatMap((question, index) =>
      questions[index].answers.map((answer) => ({
        question_id: question.id,
        answer_text: answer.answerText,
        display_letter: answer.displayLetter,
        display_order: answer.displayOrder,
        is_correct: answer.isCorrect,
      }))
    );

    const { data: createdAnswers, error: answersError } = await supabase
      .from('answers')
      .insert(answersToInsert)
      .select();

    if (answersError) throw answersError;

    return { questions: createdQuestions, answers: createdAnswers };
  } catch (error) {
    console.error('Error creating questions and answers:', error);
    throw error;
  }
};

// Main function to create everything
export const createGameWithQuestions = async (
  gameData: GameInputForDb,
  questions: QuestionForDb[],
  imageFile: File | null
) => {
  let uploadedFileName: string | null = null;

  try {
    // Handle image upload first if provided
    let finalGameData = { ...gameData };
    if (imageFile) {
      try {
        const { publicUrl, fileName } = await uploadGameImage(imageFile);
        uploadedFileName = fileName;
        finalGameData.imgUrl = publicUrl;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw new Error('Failed to upload image');
      }
    }

    // Create the game
    const game = await createGame(finalGameData);

    // Create questions and answers
    const questionsAndAnswers = await createQuestionsAndAnswers(
      game.id,
      questions
    );

    return {
      game,
      ...questionsAndAnswers,
    };
  } catch (err: unknown) {
    // Clean up uploaded image if it exists and there was an error
    if (uploadedFileName) {
      await deleteGameImage(uploadedFileName);
    }

    console.error('Error in createGameWithQuestions:', err);
    throw err;
  }
};
