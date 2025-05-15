import { AnswerToBeHashed } from '@/types';

export class MerkleTree {
  private layers: Uint8Array[][];
  private displayOrderMap: Map<number, number>;

  private constructor() {
    this.layers = [[]];
    this.displayOrderMap = new Map();
  }

  static async create(answers: AnswerToBeHashed[]): Promise<MerkleTree> {
    // Validate input
    if (!answers || answers.length === 0) {
      throw new Error('Cannot create MerkleTree with empty answers array');
    }

    const tree = new MerkleTree();

    try {
      // Create leaves and store display order mapping
      const leaves = await Promise.all(
        answers.map(async (answer, index) => {
          if (answer.displayOrder === undefined) {
            throw new Error(
              `Answer at index ${index} has undefined displayOrder`
            );
          }
          if (!answer.answer) {
            throw new Error(`Answer at index ${index} has no answer text`);
          }
          if (!answer.salt) {
            throw new Error(`Answer at index ${index} has no salt`);
          }

          tree.displayOrderMap.set(answer.displayOrder, index);
          return tree.createLeaf(answer);
        })
      );

      if (leaves.length === 0) {
        throw new Error('No leaves were created');
      }

      tree.layers = [leaves];

      // Build tree layers
      while (tree.layers[tree.layers.length - 1].length > 1) {
        const nextLayer = await tree.createNextLayer(
          tree.layers[tree.layers.length - 1]
        );
        if (!nextLayer || nextLayer.length === 0) {
          throw new Error('Failed to create next layer');
        }
        tree.layers.push(nextLayer);
      }

      return tree;
    } catch (error) {
      console.error('Error creating MerkleTree:', error);
      throw new Error(
        `Failed to create MerkleTree: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private shouldBypassSecurityCheck = process.env.NODE_ENV === 'development';
  private async createLeaf(answer: AnswerToBeHashed): Promise<Uint8Array> {
    // Check if we're in a browser environment and have crypto support
    const hasCrypto =
      typeof window !== 'undefined' &&
      window.crypto &&
      'subtle' in window.crypto;

    if (!hasCrypto && !this.shouldBypassSecurityCheck) {
      throw new Error('Crypto API not available');
    }

    try {
      const encoder = new TextEncoder();
      const displayOrderBytes = new Uint8Array([answer.displayOrder]);
      const answerBytes = encoder.encode(answer.answer);
      const saltBytes = encoder.encode(answer.salt);

      // Concatenate all bytes
      const data = new Uint8Array(
        displayOrderBytes.length + answerBytes.length + saltBytes.length
      );
      data.set(displayOrderBytes, 0);
      data.set(answerBytes, displayOrderBytes.length);
      data.set(saltBytes, displayOrderBytes.length + answerBytes.length);

      if (!crypto?.subtle) {
        throw new Error('crypto.subtle is not available');
      }

      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      if (!hashBuffer) {
        throw new Error('Hash operation failed');
      }

      return new Uint8Array(hashBuffer);
    } catch (error) {
      console.error('Error creating leaf:', error);
      throw new Error(
        `Failed to create leaf: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private async createNextLayer(nodes: Uint8Array[]): Promise<Uint8Array[]> {
    try {
      const layerNodes: Uint8Array[] = [];
      for (let i = 0; i < nodes.length; i += 2) {
        if (i + 1 === nodes.length) {
          layerNodes.push(nodes[i]);
        } else {
          const combined = new Uint8Array(
            nodes[i].length + nodes[i + 1].length
          );
          if (this.compareBuffers(nodes[i], nodes[i + 1]) <= 0) {
            combined.set(nodes[i], 0);
            combined.set(nodes[i + 1], nodes[i].length);
          } else {
            combined.set(nodes[i + 1], 0);
            combined.set(nodes[i], nodes[i + 1].length);
          }

          if (!crypto?.subtle) {
            throw new Error('crypto.subtle is not available');
          }

          const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
          if (!hashBuffer) {
            throw new Error('Hash operation failed');
          }

          layerNodes.push(new Uint8Array(hashBuffer));
        }
      }
      return layerNodes;
    } catch (error) {
      console.error('Error creating next layer:', error);
      throw new Error(
        `Failed to create next layer: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private compareBuffers(a: Uint8Array, b: Uint8Array): number {
    const minLength = Math.min(a.length, b.length);
    for (let i = 0; i < minLength; i++) {
      if (a[i] !== b[i]) {
        return a[i] - b[i];
      }
    }
    return a.length - b.length;
  }

  getRoot(): Uint8Array {
    if (
      !this.layers ||
      this.layers.length === 0 ||
      !this.layers[this.layers.length - 1][0]
    ) {
      throw new Error('Tree is empty or root is not available');
    }
    return this.layers[this.layers.length - 1][0];
  }

  getProof(displayOrder: number): Uint8Array[] {
    // Get the leaf index from the display order mapping
    const index = this.displayOrderMap.get(displayOrder);
    if (index === undefined) {
      throw new Error(`No leaf found for display order: ${displayOrder}`);
    }

    const proof: Uint8Array[] = [];
    let currentIndex = index;

    // Build proof by traversing up the tree
    for (
      let layerIndex = 0;
      layerIndex < this.layers.length - 1;
      layerIndex++
    ) {
      const isRight = currentIndex % 2 === 0;
      const pairIndex = isRight ? currentIndex + 1 : currentIndex - 1;

      if (pairIndex < this.layers[layerIndex].length) {
        proof.push(this.layers[layerIndex][pairIndex]);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }
}
