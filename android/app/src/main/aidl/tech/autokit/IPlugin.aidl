package tech.autokit;

interface IPlugin {
    Map     discover();
    String  execute(String type, String config, String state);
    String  trigger(String type, String config, in Intent intent);
}
