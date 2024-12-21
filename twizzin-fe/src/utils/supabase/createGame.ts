import { supabase } from './supabaseClient';
import { processImageFile } from './imageProcessing';
import { QuestionForDb, GameInputForDb } from '@/types';

// Types for TypeScript

// Function to handle image upload
const uploadGameImage = async (imageFile: File) => {
  try {
    const processedFile = await processImageFile(imageFile);
    const fileName = `game-images/${Date.now()}-${imageFile.name}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('game-images')
      .upload(fileName, processedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('game-images').getPublicUrl(uploadData.path);

    return { publicUrl, fileName };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Function to delete an image if transaction fails
const deleteGameImage = async (fileName: string) => {
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
const ensurePlayerExists = async (walletAddress: string) => {
  try {
    // First try to get existing player
    const { data: existingPlayer } = await supabase
      .from('players')
      .select()
      .eq('wallet_address', walletAddress)
      .single();

    if (existingPlayer) return existingPlayer;

    // If player doesn't exist, create them
    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert([{ wallet_address: walletAddress }])
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
    await ensurePlayerExists(gameData.adminWallet);

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
    // Start a transaction
    const { error: txnError } = await supabase.rpc('begin_transaction');
    if (txnError) throw txnError;

    try {
      // Handle image upload if provided
      let finalGameData = { ...gameData };
      if (imageFile) {
        const { publicUrl, fileName } = await uploadGameImage(imageFile);
        uploadedFileName = fileName;
        finalGameData.imgUrl = publicUrl;
      }

      // Create the game
      const game = await createGame(finalGameData);

      // Create questions and answers
      const questionsAndAnswers = await createQuestionsAndAnswers(
        game.id,
        questions
      );

      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) throw commitError;

      return {
        game,
        ...questionsAndAnswers,
      };
    } catch (error) {
      // Rollback on error
      const { error: rollbackError } = await supabase.rpc(
        'rollback_transaction'
      );
      if (rollbackError) {
        console.log('Error rolling back:', rollbackError);
      }

      // Clean up uploaded image if it exists
      if (uploadedFileName) {
        await deleteGameImage(uploadedFileName);
      }

      throw error;
    }
  } catch (err: unknown) {
    console.log('Error in createGameWithQuestions:', err);
    throw err;
  }
};

// Example usage:
/*
const gameData = {
  gamePubkey: "your_game_pubkey",
  adminWallet: "admin_wallet_address",
  name: "Trivia Game #1",
  // ... other game fields
};

const questions = [
  {
    questionText: "What is the capital of France?",
    displayOrder: 1,
    correctAnswer: "a",
    answers: [
      { answerText: "Paris", displayLetter: "a" },
      { answerText: "London", displayLetter: "b" },
      { answerText: "Berlin", displayLetter: "c" }
    ]
  }
];

try {
  const result = await createGameWithQuestions(gameData, questions, imageFile);
  console.log('Game created successfully:', result);
} catch (error) {
  console.error('Failed to create game:', error);
}
*/
