use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};

pub fn verify_merkle_proof(leaf: [u8; 32], proof: &[[u8; 32]], root: [u8; 32]) -> bool {
    let mut current = leaf;

    // Traverse the proof and hash at each level
    for proof_element in proof {
        current = hash_pair(current, *proof_element);
    }

    // Check if final hash matches the expected root
    current == root
}

// Helper function to create leaf node from answer data
pub fn create_leaf_hash(display_order: u8, answer: &str, salt: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update([display_order]);
    hasher.update(answer.as_bytes());
    hasher.update(salt.as_bytes());
    hasher.finalize().into()
}

// Helper to hash two nodes together
fn hash_pair(first: [u8; 32], second: [u8; 32]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    // Sort to ensure consistent ordering
    if first <= second {
        hasher.update(first);
        hasher.update(second);
    } else {
        hasher.update(second);
        hasher.update(first);
    }
    hasher.finalize().into()
}

// Example usage in an instruction
pub fn verify_answer(
    display_order: u8,
    answer: &str,
    salt: &str,
    proof: &[[u8; 32]],
    root: [u8; 32],
) -> bool {
    let leaf = create_leaf_hash(display_order, answer, salt);
    verify_merkle_proof(leaf, proof, root)
}

// how to use in typescript:
// import { createHash } from 'crypto';

// interface Answer {
//     display_order: number;
//     answer: string;
//     salt: string;
// }

// class MerkleTree {
//     private layers: Buffer[][];

//     constructor(answers: Answer[]) {
//         // Create leaf nodes
//         const leaves = answers.map(answer => this.createLeaf(answer));
//         this.layers = [leaves];

//         // Build tree layers
//         while (this.layers[this.layers.length - 1].length > 1) {
//             this.layers.push(this.createNextLayer(this.layers[this.layers.length - 1]));
//         }
//     }

//     private createLeaf(answer: Answer): Buffer {
//         const hash = createHash('sha256');
//         hash.update(Buffer.from([answer.display_order]));
//         hash.update(answer.answer);
//         hash.update(answer.salt);
//         return hash.digest();
//     }

//     private createNextLayer(nodes: Buffer[]): Buffer[] {
//         const layerNodes: Buffer[] = [];
//         for (let i = 0; i < nodes.length; i += 2) {
//             if (i + 1 === nodes.length) {
//                 layerNodes.push(nodes[i]);
//             } else {
//                 const hash = createHash('sha256');
//                 if (Buffer.compare(nodes[i], nodes[i + 1]) <= 0) {
//                     hash.update(nodes[i]);
//                     hash.update(nodes[i + 1]);
//                 } else {
//                     hash.update(nodes[i + 1]);
//                     hash.update(nodes[i]);
//                 }
//                 layerNodes.push(hash.digest());
//             }
//         }
//         return layerNodes;
//     }

//     getRoot(): Buffer {
//         return this.layers[this.layers.length - 1][0];
//     }

//     getProof(display_order: number): Buffer[] {
//         let index = this.layers[0].findIndex((leaf, idx) =>
//             idx === display_order
//         );
//         if (index === -1) return [];

//         const proof: Buffer[] = [];
//         for (let layerIndex = 0; layerIndex < this.layers.length - 1; layerIndex++) {
//             const isRight = index % 2 === 0;
//             const pairIndex = isRight ? index + 1 : index - 1;

//             if (pairIndex < this.layers[layerIndex].length) {
//                 proof.push(this.layers[layerIndex][pairIndex]);
//             }

//             index = Math.floor(index / 2);
//         }

//         return proof;
//     }
// }

// // Example usage:
// const answers: Answer[] = [
//     { display_order: 0, answer: 'a', salt: 'q1' },
//     { display_order: 1, answer: 'b', salt: 'q2' },
//     { display_order: 2, answer: 'c', salt: 'q3' },
// ];

// const tree = new MerkleTree(answers);
// const root = tree.getRoot();
// const proofForAnswer0 = tree.getProof(0);

// // These values would be used in your Solana program:
// console.log('Root to store on-chain:', root);
// console.log('Proof for answer verification:', proofForAnswer0);
