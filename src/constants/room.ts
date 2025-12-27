/**
 * Room-related constants
 */

// Timer constants
export const ROOM_TIMER = {
  DEFAULT_DURATION_SEC: 300, // 5 minutes
  EXTENSION_VOTE_START_SEC: 10, // Start vote when 10 seconds left
  VOTE_DURATION_SEC: 10, // 10 seconds to vote
} as const;

// Participant constants
export const ROOM_PARTICIPANTS = {
  MIN_PARTICIPANTS: 2,
  MAX_PARTICIPANTS: 8,
  DEFAULT_MAX_PARTICIPANTS: 8,
} as const;

// Avatar positions for room screen (8 positions in a circle)
export const AVATAR_POSITIONS = [
  {top: '5%', left: '50%', transform: [{translateX: -40}, {translateY: -10}]}, // Top
  {top: '15%', right: '15%'}, // Top Right
  {top: '50%', right: '5%', transform: [{translateY: -40}]}, // Right
  {bottom: '15%', right: '15%'}, // Bottom Right
  {bottom: '5%', left: '50%', transform: [{translateX: -40}, {translateY: 10}]}, // Bottom
  {bottom: '15%', left: '15%'}, // Bottom Left
  {top: '50%', left: '5%', transform: [{translateY: -40}]}, // Left
  {top: '15%', left: '15%'}, // Top Left
] as const;








