#define CATCH_CONFIG_MAIN

#include "catch.hpp"
#include "AudioEngine.h"

TEST_CASE("FMOD System addition and removal", "[FMOD::System]")
{
	auto inst = FMOD_Handler::instance();
	auto a = new audioEngine();
	a->init();

	SECTION("Test addSystem")
	{
		a->addSystem("Test System");
		REQUIRE(inst->_mSystems.find("Test System") != inst->_mSystems.end());
		REQUIRE(inst->_dChannels.find("Test System") != inst->_dChannels.end());
		REQUIRE(inst->_dSounds.find("Test System") != inst->_dSounds.end());

		//Ensure no two same keys can be inserted.
		a->addSystem("Test System");
		REQUIRE(inst->_mSystems.size() == 1);
		REQUIRE(inst->_dChannels.size() == 1);
		REQUIRE(inst->_dSounds.size() == 1);

		a->addSystem("Test System 2");
		REQUIRE(inst->_mSystems.size() == 2);
		REQUIRE(inst->_mSystems.find("Test System 2") != inst->_mSystems.end());
		REQUIRE(inst->_dChannels.size() == 2);
		REQUIRE(inst->_dChannels.find("Test System 2") != inst->_dChannels.end());
		REQUIRE(inst->_dSounds.size() == 2);
		REQUIRE(inst->_dSounds.find("Test System 2") != inst->_dSounds.end());
	}
	
	SECTION("Test removeSystem")
	{
		a->addSystem("Test System 3");
		a->addSystem("Test System 4");
		a->removeSystem("Test System 3");

		//inst should have 3 systems total, 2 of which are from the previous SECTION
		REQUIRE(inst->_mSystems.size() == 3);
		REQUIRE(inst->_mSystems.find("Test System 3") == inst->_mSystems.end());
		REQUIRE(inst->_dChannels.size() == 3);
		REQUIRE(inst->_dChannels.find("Test System 3") == inst->_dChannels.end());
		REQUIRE(inst->_dSounds.size() == 3);
		REQUIRE(inst->_dSounds.find("Test System 3") == inst->_dSounds.end());

		a->removeSystem("Test System");
		a->removeSystem("Test System 2");
		a->removeSystem("Test System 4");
	}	
}

TEST_CASE("Loading and unloading of sounds", "[FMOD::Sound]")
{
	auto inst = FMOD_Handler::instance();
	auto a = new audioEngine();
	a->init();
	a->addSystem("Test Load");
	a->loadSound("Test Load", "audio/jaguar.wav", false, true, false);
	auto dSoundsIt = inst->_dSounds.find("Test Load");
	REQUIRE(dSoundsIt != inst->_dSounds.end());
	auto mSoundsIt = dSoundsIt->second.find("audio/jaguar.wav");
	REQUIRE(mSoundsIt != dSoundsIt->second.end());

	FMOD_MODE mode;
	FMOD::Sound *sound = inst->_dSounds["Test Load"]["audio/jaguar.wav"];
	audioEngine::errorCheck(sound->getMode(&mode));
	REQUIRE(mode & FMOD_LOOP_NORMAL);
	
	a->unloadSound("Test Load", "audio/jaguar.wav");
	mSoundsIt = dSoundsIt->second.find("audio/jaguar.wav");
	REQUIRE(mSoundsIt == dSoundsIt->second.end());
}

TEST_CASE("Create Channel via aePlaySound and unload channels", "[FMOD::System::playSound]")
{
	auto inst = FMOD_Handler::instance();
	auto a = new audioEngine();
	a->addSystem("Test aePlaySound");
	int channel1 = a->aePlaySound("Test aePlaySound", "audio/jaguar.wav");
	int channel2 = a->aePlaySound("Test aePlaySound", "audio/jaguar.wav");
	int channel3 = a->aePlaySound("Test aePlaySound", "audio/jaguar.wav");

	auto mChannelIt1 = inst->_dChannels["Test aePlaySound"].find(channel1);
	auto mChannelIt2 = inst->_dChannels["Test aePlaySound"].find(channel2);
	auto mChannelIt3 = inst->_dChannels["Test aePlaySound"].find(channel3);
	REQUIRE(mChannelIt1 != inst->_dChannels["Test aePlaySound"].end());
	REQUIRE(mChannelIt2 != inst->_dChannels["Test aePlaySound"].end());
	REQUIRE(mChannelIt3 != inst->_dChannels["Test aePlaySound"].end());
	
	a->unloadChannel("Test aePlaySound", channel1);
	mChannelIt1 = inst->_dChannels["Test aePlaySound"].find(channel1);
	REQUIRE(mChannelIt1 == inst->_dChannels["Test aePlaySound"].end());

	a->unloadAllChannelsInSystem("Test aePlaySound");
	mChannelIt2 = inst->_dChannels["Test aePlaySound"].find(channel2);
	mChannelIt3 = inst->_dChannels["Test aePlaySound"].find(channel3);
	REQUIRE(mChannelIt2 == inst->_dChannels["Test aePlaySound"].end());
	REQUIRE(mChannelIt3 == inst->_dChannels["Test aePlaySound"].end());
}

TEST_CASE("Volume test", "[ChannelControl::getVolume]")
{
	auto inst = FMOD_Handler::instance();
	auto a = new audioEngine();
	a->addSystem("Test Volume");
	int channel = a->aePlaySound("Test Volume", "audio/jaguar.wav");
	a->setPauseOnChannel("Test Volume", channel, true);
	
	a->setChannelVolume("Test Volume", channel, 20.0);	
	auto dChannelIt = inst->_dChannels.find("Test Volume");
	auto mChannelIt = dChannelIt->second.find(channel);
	float volume;
	REQUIRE(mChannelIt->second->getVolume(&volume) == FMOD_OK);
	REQUIRE(volume == 10.0);

	a->setChannelVolume("Test Volume", channel, -20.0);
	REQUIRE(mChannelIt->second->getVolume(&volume) == FMOD_OK);
	REQUIRE(volume == 1.0);

	a->setChannelVolume("Test Volume", channel, 1000);
	REQUIRE(mChannelIt->second->getVolume(&volume) == FMOD_OK);
	REQUIRE(volume == 56234.13251f);
}
