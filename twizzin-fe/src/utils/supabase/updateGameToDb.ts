import { supabase } from './supabaseClient';
import { QuestionForDb, GameInputForDb } from '@/types';
import { uploadGameImage, deleteGameImage } from './createGame';

type VerificationFunction = <T>(operation: () => Promise<T>, errorMessage?: string) => Promise<T | null>;

interface UploadResult {
  publicUrl: string;
  fileName: string;
}

// Update game in database
const updateGameInDb = async (
  gameId: string,
  updateData: {
    name: string;
    entry_fee: number;
    commission_bps: number;
    start_time: string;
    end_time: string;
    max_winners: number;
    donation_amount: number;
    all_are_winners: boolean;
    even_split: boolean;
    username?: string;
    img_url?: string;
  }
) => {
  try {
    const { data: game, error: gameError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId)
      .select()
      .single();

    if (gameError) throw gameError;
    return game;
  } catch (error) {
    console.error('Error updating game:', error);
    throw error;
  }
};

// Function to update questions and answers
const updateQuestionsAndAnswers = async (
  gameId: string,
  questions: QuestionForDb[]
) => {
  try {
    // First delete all existing questions and their answers
    const { error: deleteQuestionsError } = await supabase
      .from('questions')
      .delete()
      .eq('game_id', gameId);

    if (deleteQuestionsError) throw deleteQuestionsError;

    // Create new questions
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

    // Create answers for each question
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
    console.error('Error updating questions and answers:', error);
    throw error;
  }
};

// Main function to update everything
export const updateGameWithQuestions = async (
  gameId: string,
  updateData: {
    name: string;
    entry_fee: number;
    commission_bps: number;
    start_time: string;
    end_time: string;
    max_winners: number;
    donation_amount: number;
    all_are_winners: boolean;
    even_split: boolean;
    username?: string;
    img_url?: string;
  },
  questions: QuestionForDb[],
  imageFile: File | null,
  withVerification: VerificationFunction
) => {
  return withVerification(async () => {
    let uploadedFileName: string | null = null;

    try {
      // Handle image upload if provided
      let finalUpdateData = { ...updateData };
      if (imageFile) {
        try {
          const uploadResult = await uploadGameImage(imageFile, withVerification);
          if (uploadResult) {
            uploadedFileName = uploadResult.fileName;
            finalUpdateData.img_url = uploadResult.publicUrl;
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw new Error('Failed to upload image');
        }
      }

      // Update game data
      const game = await updateGameInDb(gameId, finalUpdateData);

      // Update questions and answers
      const questionsAndAnswers = await updateQuestionsAndAnswers(
        gameId,
        questions
      );

      return {
        game,
        ...questionsAndAnswers,
      };
    } catch (err: unknown) {
      // Clean up uploaded image if it exists and there was an error
      if (uploadedFileName) {
        await deleteGameImage(uploadedFileName, withVerification);
      }

      console.error('Error in updateGameWithQuestions:', err);
      throw err;
    }
  });
};

export const updateGameToDb = async (
  gameId: string,
  gameData: Partial<GameInputForDb>,
  imageFile: File | null,
  withVerification: VerificationFunction
) => {
  return withVerification(async () => {
    try {
      let finalGameData = { ...gameData };
      let uploadedFileName: string | null = null;

      // Handle image upload if provided
      if (imageFile) {
        const uploadResult = await uploadGameImage(imageFile, withVerification) as UploadResult | null;
        if (uploadResult) {
          uploadedFileName = uploadResult.fileName;
          finalGameData.img_url = uploadResult.publicUrl;
        }
      }

      // Update the game
      const { data: updatedGame, error } = await supabase
        .from('games')
        .update(finalGameData)
        .eq('id', gameId)
        .select()
        .single();

      if (error) {
        // If there was an error and we uploaded an image, clean it up
        if (uploadedFileName) {
          await deleteGameImage(uploadedFileName, withVerification);
        }
        throw error;
      }

      return updatedGame;
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
    }
  });
};
