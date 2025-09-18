// Utility functions for Explore.fyi

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Format time duration to human readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Calculate difficulty color class
 */
export function getDifficultyColor(difficulty: number): string {
  const colors = {
    1: 'text-green-600 bg-green-50',
    2: 'text-green-600 bg-green-50',
    3: 'text-yellow-600 bg-yellow-50',
    4: 'text-orange-600 bg-orange-50',
    5: 'text-red-600 bg-red-50'
  };
  return colors[difficulty as keyof typeof colors] || colors[3];
}

/**
 * Get difficulty label
 */
export function getDifficultyLabel(difficulty: number): string {
  const labels = {
    1: 'Very Easy',
    2: 'Easy',
    3: 'Medium',
    4: 'Hard',
    5: 'Very Hard'
  };
  return labels[difficulty as keyof typeof labels] || 'Medium';
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Calculate credibility score based on domain
 */
export function calculateCredibilityScore(domain: string): number {
  const highCredibility = [
    'wikipedia.org',
    'edu',
    'gov',
    'mozilla.org',
    'w3.org',
    'stackoverflow.com',
    'github.com'
  ];
  
  const mediumCredibility = [
    'medium.com',
    'dev.to',
    'freecodecamp.org',
    'codecademy.com',
    'coursera.org',
    'edx.org'
  ];
  
  if (highCredibility.some(cred => domain.includes(cred))) {
    return 0.9;
  }
  
  if (mediumCredibility.some(cred => domain.includes(cred))) {
    return 0.7;
  }
  
  // Default credibility for unknown domains
  return 0.5;
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Convert string to slug (URL-friendly)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Determines optimal connection handles based on node position relative to parent
 */
export function getOptimalHandles(angle: number): { sourceHandle: string; targetHandle: string } {
  // Convert angle to degrees for easier calculation
  const degrees = (angle * 180) / Math.PI;
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  
  if (normalizedDegrees >= 315 || normalizedDegrees < 45) {
    // Right side - node is to the right of center
    return { sourceHandle: 'right', targetHandle: 'target-left' };
  } else if (normalizedDegrees >= 45 && normalizedDegrees < 135) {
    // Bottom - node is below center
    return { sourceHandle: 'bottom', targetHandle: 'target-top' };
  } else if (normalizedDegrees >= 135 && normalizedDegrees < 225) {
    // Left side - node is to the left of center
    return { sourceHandle: 'left', targetHandle: 'target-right' };
  } else {
    // Top - node is above center
    return { sourceHandle: 'top', targetHandle: 'target-bottom' };
  }
}

/**
 * Calculate safe radius for circular node layout to prevent overlaps
 */
export function calculateSafeRadius(
  nodeCount: number,
  nodeWidth: number,
  minGap: number = 80,
  minRadius: number = 200
): number {
  if (nodeCount <= 1) return minRadius;
  
  // Calculate circumference needed for all nodes with gaps
  const totalWidth = nodeCount * (nodeWidth + minGap);
  const radiusFromCircumference = totalWidth / (2 * Math.PI);
  
  return Math.max(minRadius, radiusFromCircumference);
}

/**
 * Calculate layout positions for mind map nodes
 */
export function calculateNodePositions(
  nodes: Array<{ id: string; level: number }>,
  centerX = 400,
  centerY = 300
): Array<{ id: string; x: number; y: number }> {
  const positions: Array<{ id: string; x: number; y: number }> = [];
  const levelGroups: { [level: number]: string[] } = {};
  
  // Group nodes by level
  nodes.forEach(node => {
    if (!levelGroups[node.level]) {
      levelGroups[node.level] = [];
    }
    levelGroups[node.level].push(node.id);
  });
  
  // Calculate positions for each level
  Object.entries(levelGroups).forEach(([levelStr, nodeIds]) => {
    const level = parseInt(levelStr);
    const nodeCount = nodeIds.length;
    
    // Calculate safe radius based on node count and level
    const nodeWidth = level === 0 ? 288 : 256; // TopicNode vs ConceptNode max-width + padding
    const levelRadius = Math.max(200, level * 250); // Base radius per level
    const radius = calculateSafeRadius(nodeCount, nodeWidth, 80, levelRadius);
    
    const angleStep = (2 * Math.PI) / Math.max(nodeCount, 1);
    
    nodeIds.forEach((nodeId, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      positions.push({ id: nodeId, x, y });
    });
  });
  
  return positions;
}

/**
 * Local storage helpers with error handling
 */
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
};
