
import React, { useState } from "react";
import { Link } from "react-router-dom";

type PetKey = "baby-dino" | "golden-retriever" | "healing-elephant" | "chintu-fox";

type DigitalPetsHubPageProps = {
  selectedPet?: PetKey;
};

const PETS = [
  {
    key: "baby-dino",
    name: "Baby Dinosaur",
    emoji: "🦕",
    hormone: "Love",
    hormoneDesc: "Oxytocin — nurture, bond, feel loved"
  },
  {
    key: "golden-retriever",
    name: "Golden Retriever",
    emoji: "🐕",
    hormone: "Happy",
    hormoneDesc: "Serotonin — daily routines, calm, stability"
  },
  {
    key: "healing-elephant",
    name: "Healing Elephant",
    emoji: "🐘",
    hormone: "Reward",
    hormoneDesc: "Dopamine — achievements, games, milestones"
  },
  {
    key: "chintu-fox",
    name: "Chintu Fox",
    emoji: "🦊",
    hormone: "Energy",
    hormoneDesc: "Endorphins — breathwork, play, laughter"
  }
];

const DigitalPetsHubPage: React.FC<DigitalPetsHubPageProps> = ({ selectedPet: selectedPetProp }) => {
  const [selectedPet, setSelectedPet] = useState<PetKey | undefined>(selectedPetProp);

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px #0001" }}>
      <h1 style={{ textAlign: "center", fontWeight: 700, fontSize: 28, marginBottom: 8 }}>Digital Pets <span style={{ color: "#a78bfa" }}>4 Happy Hormones</span></h1>
      <p style={{ textAlign: "center", color: "#475569", marginBottom: 24 }}>
        4 pets, 4 hormones — nurture them, nurture you
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginBottom: 32 }}>
        {PETS.map((pet) => (
          <button
            key={pet.key}
            onClick={() => setSelectedPet(pet.key as PetKey)}
            style={{
              border: selectedPet === pet.key ? "2px solid #a78bfa" : "1.5px solid #e5e7eb",
              background: selectedPet === pet.key ? "#ede9fe" : "#fff",
              borderRadius: 14,
              padding: "18px 20px",
              minWidth: 110,
              cursor: "pointer",
              boxShadow: selectedPet === pet.key ? "0 2px 12px #a78bfa33" : "none",
              fontWeight: 600,
              fontSize: 18,
              color: "#1e293b",
              outline: "none"
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 6 }}>{pet.emoji}</div>
            <div>{pet.name}</div>
            <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 2 }}>{pet.hormone}</div>
          </button>
        ))}
      </div>
      {selectedPet && (
        <div style={{ textAlign: "center", marginBottom: 24, padding: 16, background: "#f3f4f6", borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            {PETS.find((p) => p.key === selectedPet)?.emoji}
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
            {PETS.find((p) => p.key === selectedPet)?.name}
          </div>
          <div style={{ color: "#7c3aed", fontWeight: 600, marginBottom: 2 }}>
            {PETS.find((p) => p.key === selectedPet)?.hormone}
          </div>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>
            {PETS.find((p) => p.key === selectedPet)?.hormoneDesc}
          </div>
        </div>
      )}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <button
          style={{
            background: "#f472b6",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "14px 28px",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            marginBottom: 8
          }}
        >
          💝 Name Your Pet — Adopt
        </button>
        <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>Free — Choose, name, and start your journey</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <Link to="/">Go Home</Link>
      </div>
    </div>
  );
};

export default DigitalPetsHubPage;
