import { query } from "../src/lib/db/client";
import { embed } from "../src/lib/embeddings";

// A few short faith-formation documents to make RAG retrieval testable
// before the document-upload UI exists (that comes in Phase 4). Each document
// is split into paragraph-sized chunks on blank lines.
const DOCUMENTS = [
  {
    title: "The Holy Qurbana",
    content: `The Holy Qurbana is the Divine Liturgy of the Syro-Malabar Church and the central act of its worship. The word "Qurbana" comes from a Syriac root meaning "offering" or "sacrifice." In it the community gathers to celebrate the Eucharist, listen to the Word of God, and receive the Body and Blood of Christ.

The principal eucharistic prayer of the Qurbana is the Anaphora of Addai and Mari, which dates to the third century and is one of the oldest eucharistic prayers in continuous use in all of Christianity. It is traditionally attributed to the apostles Addai and Mari, disciples in the East Syriac tradition.`,
  },
  {
    title: "Origins of the Syro-Malabar Church",
    content: `The Syro-Malabar Church traces its origin to the Apostle Thomas, known in Malayalam as Mar Thoma Sleeha, who according to tradition arrived on the Malabar Coast of Kerala, India, in the year 52 AD. He preached the Gospel and established Christian communities among the local people.

Tradition holds that Saint Thomas founded seven and a half churches in India, known in Malayalam as the Ezharappallikal. These early foundations became the seed of the ancient Christian community of Kerala, sometimes called the Saint Thomas Christians or Nasranis.`,
  },
  {
    title: "The Seven Sacraments",
    content: `The Catholic Church celebrates seven sacraments, which are efficacious signs of grace instituted by Christ. They are Baptism, Confirmation, the Eucharist, Reconciliation (also called Penance or Confession), the Anointing of the Sick, Holy Orders, and Matrimony.

The first three — Baptism, Confirmation, and the Eucharist — are called the sacraments of initiation, because through them a believer is fully incorporated into the life of the Church.`,
  },
];

async function seed() {
  // Documents require an owner (uploaded_by). Create a dedicated seed user
  // if one does not already exist, so the script is self-contained.
  const ownerResult = await query<{ id: string }>(
    `INSERT INTO users (email, password_hash, role)
     VALUES ('seed@igniters.local', 'x', 'leader')
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`
  );
  const ownerId = ownerResult.rows[0].id;

  // Make the script idempotent: remove any previously seeded documents
  // (chunks cascade on delete) before inserting fresh ones.
  await query("DELETE FROM documents WHERE source_key LIKE 'seed:%'");

  let chunkCount = 0;
  for (const doc of DOCUMENTS) {
    const docResult = await query<{ id: string }>(
      `INSERT INTO documents (title, source_key, mime_type, uploaded_by, status)
       VALUES ($1, $2, 'text/plain', $3, 'ready')
       RETURNING id`,
      [doc.title, `seed:${doc.title}`, ownerId]
    );
    const documentId = docResult.rows[0].id;

    const chunks = doc.content.split("\n\n").map((c) => c.trim()).filter(Boolean);
    for (const chunk of chunks) {
      const embedding = await embed(chunk);
      await query(
        `INSERT INTO chunks (document_id, content, embedding)
         VALUES ($1, $2, $3::vector)`,
        [documentId, chunk, `[${embedding.join(",")}]`]
      );
      chunkCount++;
    }
    console.log(`  ✓ ${doc.title} (${chunks.length} chunks)`);
  }

  console.log(`Seed complete: ${DOCUMENTS.length} documents, ${chunkCount} chunks.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
