export JAVA_HOME=`/usr/libexec/java_home -v 17`
export PATH=$JAVA_HOME/bin:$PATH
export ANDROID_HOME=/Users/artemdanilisin/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools

# [1] gradle cleaning:
# cd android && ./gradlew clean && cd ..

# [2] code cleeaning
# rm -rf ./android/app/build ./android/build ./android/app/.cxx

# [3] generate codeget files
# ./gradlew :app:generateCodegenArtifactsFromSchema

# [4] macos fix
# find . -name ".DS_Store" -delete