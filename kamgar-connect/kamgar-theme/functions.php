<?php
function kamgar_enqueue_scripts() {
    wp_enqueue_script('kamgar-config', get_stylesheet_directory_uri() . '/config.js', array(), '1.0', false);
    wp_enqueue_style('kamgar-style', get_stylesheet_directory_uri() . '/style.css');
    wp_enqueue_style('kamgar-voice', get_stylesheet_directory_uri() . '/voice.css');
    wp_enqueue_script('gsap', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js', array(), null, true);
    wp_enqueue_script('scrolltrigger', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js', array('gsap'), null, true);
    wp_enqueue_script('socketio', 'https://cdn.socket.io/4.7.2/socket.io.min.js', array(), null, true);
    wp_enqueue_script('kamgar-main', get_stylesheet_directory_uri() . '/main.js', array('kamgar-config', 'gsap', 'scrolltrigger'), '1.0', true);
    wp_enqueue_script('kamgar-voice-js', get_stylesheet_directory_uri() . '/voice.js', array(), '1.0', true);
    wp_enqueue_script('kamgar-i18n', get_stylesheet_directory_uri() . '/i18n.js', array(), '1.0', true);
    wp_enqueue_script('kamgar-sync', get_stylesheet_directory_uri() . '/sync.js', array(), '1.0', true);
}
add_action('wp_enqueue_scripts', 'kamgar_enqueue_scripts');
?>
