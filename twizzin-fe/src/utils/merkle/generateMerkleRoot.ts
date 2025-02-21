import { QuestionFromDb } from '@/types';
import { MerkleTree } from './MerkleTree';

export async function generateMerkleRoot(
  questions: QuestionFromDb[]
): Promise<number[]> {
  if (!questions || questions.length === 0) {
    throw new Error('No questions provided for merkle root generation');
  }

  const answers = questions.map((q, index) => {
    if (q.display_order === undefined) {
      throw new Error(`Question at index ${index} has no display_order`);
    }
    if (!q.correct_answer) {
      throw new Error(`Question at index ${index} has no correct_answer`);
    }

    return {
      displayOrder: q.display_order,
      answer: q.correct_answer,
      salt: q.id,
    };
  });

  const tree = await MerkleTree.create(answers);
  const root = tree.getRoot();

  return Array.from(root);
}
