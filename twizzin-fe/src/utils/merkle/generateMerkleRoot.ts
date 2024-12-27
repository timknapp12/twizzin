import { QuestionForDb } from '@/types';
import { MerkleTree } from './MerkleTree';

export async function generateMerkleRoot(
  questions: QuestionForDb[]
): Promise<number[]> {
  const answers = questions.map((q) => ({
    displayOrder: q.displayOrder,
    answer: q.correctAnswer,
    salt: q.id || crypto.randomUUID(), // Use question ID as salt, or generate one if not available
  }));

  const tree = await MerkleTree.create(answers);
  const root = tree.getRoot();

  return Array.from(root); // Returns array of numbers (0-255)
}
