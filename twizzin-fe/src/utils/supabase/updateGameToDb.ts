import { supabase } from './supabaseClient';
import { QuestionForDb } from '@/types';
import { uploadGameImage, deleteGameImage } from './createGame';

// Update game in database
const updateGameInDb = async (
  gameId: string,
  updateData: {
    name: string;
    entryFee: number;
    commissionBps: number;
    startTime: string;
    endTime: string;
    maxWinners: number;
    donationAmount: number;
    allAreWinners: boolean;
    evenSplit: boolean;
    username?: string;
    imgUrl?: string;
  }
) => {
  try {
    const { data: game, error: gameError } = await supabase
      .from('games')
      .update({
        name: updateData.name,
        entry_fee: updateData.entryFee,
        commission_bps: updateData.commissionBps,
        start_time: updateData.startTime,
        end_time: updateData.endTime,
        max_winners: updateData.maxWinners,
        donation_amount: updateData.donationAmount,
        all_are_winners: updateData.allAreWinners,
        even_split: updateData.evenSplit,
        img_url: updateData.imgUrl, // Only update if provided
      })
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
    entryFee: number;
    commissionBps: number;
    startTime: string;
    endTime: string;
    maxWinners: number;
    donationAmount: number;
    allAreWinners: boolean;
    evenSplit: boolean;
    username?: string;
    imgUrl?: string;
  },
  questions: QuestionForDb[],
  imageFile: File | null
) => {
  let uploadedFileName: string | null = null;

  try {
    // Handle image upload if provided
    let finalUpdateData = { ...updateData };
    if (imageFile) {
      try {
        const { publicUrl, fileName } = await uploadGameImage(imageFile);
        uploadedFileName = fileName;
        finalUpdateData.imgUrl = publicUrl;
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
      await deleteGameImage(uploadedFileName);
    }

    console.error('Error in updateGameWithQuestions:', err);
    throw err;
  }
};
