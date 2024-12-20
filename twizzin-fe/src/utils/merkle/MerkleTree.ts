import { AnswerToBeHashed } from '@/types';

export class MerkleTree {
  private layers: Uint8Array[][];

  private constructor() {
    this.layers = [[]];
  }

  static async create(answers: AnswerToBeHashed[]): Promise<MerkleTree> {
    const tree = new MerkleTree();
    const leaves = await Promise.all(
      answers.map((answer) => tree.createLeaf(answer))
    );
    tree.layers = [leaves];

    // Build tree layers
    while (tree.layers[tree.layers.length - 1].length > 1) {
      tree.layers.push(
        await tree.createNextLayer(tree.layers[tree.layers.length - 1])
      );
    }

    return tree;
  }

  private async createLeaf(answer: AnswerToBeHashed): Promise<Uint8Array> {
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

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }

  private async createNextLayer(nodes: Uint8Array[]): Promise<Uint8Array[]> {
    const layerNodes: Uint8Array[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      if (i + 1 === nodes.length) {
        layerNodes.push(nodes[i]);
      } else {
        const combined = new Uint8Array(nodes[i].length + nodes[i + 1].length);
        if (this.compareBuffers(nodes[i], nodes[i + 1]) <= 0) {
          combined.set(nodes[i], 0);
          combined.set(nodes[i + 1], nodes[i].length);
        } else {
          combined.set(nodes[i + 1], 0);
          combined.set(nodes[i], nodes[i + 1].length);
        }
        const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
        layerNodes.push(new Uint8Array(hashBuffer));
      }
    }
    return layerNodes;
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
    return this.layers[this.layers.length - 1][0];
  }

  getProof(displayOrder: number): Uint8Array[] {
    let index = this.layers[0].findIndex((_, idx) => idx === displayOrder);
    if (index === -1) return [];

    const proof: Uint8Array[] = [];
    for (
      let layerIndex = 0;
      layerIndex < this.layers.length - 1;
      layerIndex++
    ) {
      const isRight = index % 2 === 0;
      const pairIndex = isRight ? index + 1 : index - 1;

      if (pairIndex < this.layers[layerIndex].length) {
        proof.push(this.layers[layerIndex][pairIndex]);
      }

      index = Math.floor(index / 2);
    }

    return proof;
  }
}
