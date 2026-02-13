/**
 * Fetches dynamic TURN/STUN credentials from Metered.ca
 * This ensures calls work across different networks (NAT/Firewalls).
 */
export const getIceServers = async () => {
  const apiKey = import.meta.env.VITE_METERED_API_KEY;
  
  if (!apiKey) {
    console.warn("Metered API Key missing. Falling back to default STUN servers.");
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
  }

  try {
    const response = await fetch(`https://chat_app_fiber.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`);
    if (!response.ok) throw new Error("Failed to fetch TURN credentials");
    
    const iceServers = await response.json();
    console.log("Successfully fetched dynamic ICE servers");
    return iceServers;
  } catch (error) {
    console.error("Error fetching TURN credentials:", error);
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
  }
};
