<?php


namespace Drupal\hello\Plugin\Block;


use Drupal\Core\Block\BlockBase;

/**
 * Provides a 'Hello' block.
 *
 * @Block(
 *   id = "hello_block",
 *   admin_label = @Translation("Hello"),
 * )
 */
class HelloBlock extends BlockBase
{
  public function build()
  {
    return array(
      '#title' => 'Hello',
    );
  }

}
