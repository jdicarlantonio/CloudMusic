#ifndef __AUDIO_ENGINE__
#define __AUDIO_ENGINE__

#include "fmod.hpp"
#include <map>
#include <string>
#include <vector>
#include <math.h>
#include <iostream>

using namespace std;

/*
 * Handler for calls to the FMOD API itself.
 * Encapsulated to decouple from the audioEngine and dspEngine.
 * Singleton, so that audioEngine will always use the same and only FMOD_Handler,
 * 
 * Ideally, its instance is never invoked outside of calls from audioEngine
 */

class FMOD_Handler
{
public:	
	static FMOD_Handler *instance();
	void update();
	void addSystem(string systemID);
	void removeSystem(string systemID);
	int getNextChannelID();

	typedef map<string, FMOD::System*> _SystemMap;      //Container for all FMOD systems
	typedef map<string, FMOD::Sound*> _SoundMap;
	typedef map<string, _SoundMap> _SoundDirectory;	    //left: System the SoundMap is set to
													    //right: Map of sounds for a given system
	typedef map<int, FMOD::Channel*> _ChannelMap;
	typedef map<string, _ChannelMap> _ChannelDirectory; //left: System the ChannelMap is set to
													    //right: Map of channels for a given system
	_SystemMap _mSystems;
	_ChannelDirectory _dChannels;
	_SoundDirectory _dSounds;
	
protected:
	FMOD_Handler();
	~FMOD_Handler();

private:
	static FMOD_Handler *_instance;
	int _nextChannelID;
};


/*
 * Handler for loading, unloading, playing, stopping, and changing audio
 */
class audioEngine
{
public:
	static void init();
	static void update();
	static int errorCheck(FMOD_RESULT result);
	static void addSystem(string systemID);
	static void removeSystem(string systemID);

	void loadSound(string systemID, const string& strSoundName, bool b3d = true, bool bLooping = false, bool bStream = false);
	void unloadSound(string systemID, const string& strSoundName);
	int aePlaySound(string systemID, const string& strSoundName, FMOD_VECTOR vec3 = FMOD_VECTOR{ 0, 0, 0 }, float fVolumedB = 0.0f); //Distinct from FMOD_Channel's playSound
	void unloadChannel(string systemID, int channelID); //Can also be used to preemptively stop sound from a channel
	void unloadAllChannels(string systemID); //Unload channels in a GIVEN system, not in ALL systems
	void togglePauseOnChannel(string systemID, int channelID);
	void setChannelVolume(string systemID, int channelID, float fVolumedB);
	bool aeIsPlaying(string systemID, int channelID) const; //distinct from FMOD_Channel's isPlaying

	float dbToVolume(float fVolumedB);
	float volumeTodb(float fVolumedB);
};

class dspEngine
{
public:

};

#endif