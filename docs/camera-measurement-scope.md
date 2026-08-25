# Camera-Assisted Measurement Scope

Expo Camera provides a live `CameraView`, permission handling, and still-image capture on iOS, Android, and supported web browsers. A captured picture can be used as a reference for a service quote, but Expo Camera does not itself provide AR plane detection or a trustworthy square-metre calculation from a single photo.[1]

The first Chapman implementation will therefore use a **camera-assisted estimate**: the customer can take a room or carpet photo, choose a size guide or enter length and width, and receive a transparent estimated range. A manual length-and-width route will always remain available. A true AR measurement experience requires an ARKit/ARCore-capable native implementation or a dedicated measurement provider, which must be added later in a custom build rather than represented as a completed capability in Expo Go.

## References

[1]: https://docs.expo.dev/versions/latest/sdk/camera/ "Expo Camera documentation"
