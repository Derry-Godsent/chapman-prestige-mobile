# Expo Go Live Testing Notes

The official Expo CLI documentation confirms that `EXPO_PACKAGER_PROXY_URL` can force the public URL embedded in Expo deep links, and that `npx expo start --tunnel` publishes through an ngrok-backed public URL for remote-device testing. Expo also documents the `/_expo/open?platform=ios&runtime=expo` endpoint as a safe way to inspect the exact Expo Go deep link that the active server emits.[1]

For the Chapman managed environment, the direct managed host successfully served the iOS JavaScript bundle through HTTP, but Expo Go still failed to open the `exps://` session. The previous Expo ngrok tunnel returned `ERR_NGROK_3200`, so no future phone-test link should be given until its public manifest and deep link are both verified from the running session.

## References

[1]: https://docs.expo.dev/more/expo-cli/ "Expo CLI documentation"
