export type ParticipantRole = "speaker" | "listener";

export interface Participant {
  id: string;              // Anonim ID (participant.id, userId değil)
  blindName: string;       // Anonim isim
  avatarSeed?: number;     // Avatar seed
  gender: 'male' | 'female';
  role?: ParticipantRole;
  isSpeaking?: boolean;
  isMuted?: boolean;
  userId?: string;        // Host kontrolü için userId (opsiyonel, sadece host kontrolü için)
  // Deprecated: name ve avatar alanları artık kullanılmıyor, blindName ve avatarSeed kullanılmalı
  name?: string;           // Deprecated - backward compatibility için
  avatar?: string;         // Deprecated - backward compatibility için
}

export interface Room {
  id: string;
  name: string;
  category: string;
  description?: string;
  rules?: string;
  theme?: string;
  maxParticipants: number;
  currentParticipants: number;
  timeLeftSec: number;
  durationSec: number;
  extended: boolean;
  extensionYes?: number;
  extensionNo?: number;
  hostId?: string; // Oda host'unun ID'si
  listenerMessagesEnabled?: boolean; // Dinleyici mesajları açık mı
  participants: Participant[];
  maleCount: number;
  femaleCount: number;
  createdAt: string;
}

export interface CreateRoomInput {
  name: string;
  category: string;
  maxParticipants?: number;
  durationSec?: number;
  description?: string;
  rules?: string;
  theme?: string;
}
