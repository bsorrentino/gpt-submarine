import { test, expect } from '@playwright/test';
test('desktop mission controls, pause, and reload', async ({ page }) => {
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1440,height:1100});
  await page.goto('/');await expect(page.getByRole('button',{name:'Take command'})).toBeVisible();
  await page.screenshot({path:'test-results/desktop-briefing.png'});
  await page.getByRole('button',{name:'Take command'}).click();
  await expect(page.locator('#status')).toHaveText('ENGAGEMENT ACTIVE');
  await page.keyboard.press('1');await expect(page.locator('[data-depth="90"]')).toHaveAttribute('aria-pressed','true');
  await page.keyboard.down('d');await page.keyboard.down(' ');await page.waitForTimeout(1200);await page.keyboard.up(' ');await page.keyboard.up('d');
  await expect(page.locator('#shots')).not.toHaveText('00');
  await page.screenshot({path:'test-results/desktop-game.png'});
  await page.keyboard.press('p');await expect(page.getByRole('button',{name:'Resume mission'})).toBeVisible();
  const time=await page.locator('#time').textContent();await page.waitForTimeout(1100);await expect(page.locator('#time')).toHaveText(time!);
  await page.getByRole('button',{name:'Resume mission'}).click();await expect(page.locator('#overlay')).toBeHidden();
  expect(errors).toEqual([]);
});
test('mobile layout and pointer launch controls',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Take command'}).click();
  await page.locator('[data-depth="230"]').click();await expect(page.locator('[data-depth="230"]')).toHaveAttribute('aria-pressed','true');
  const launcher=page.locator('[data-hold="port"]');await launcher.scrollIntoViewIfNeeded();const box=(await launcher.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(150);await page.mouse.up();
  await expect(page.locator('#shots')).not.toHaveText('00');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/mobile-game.png',fullPage:true});
});
test('torpedo strike reaches defeat and deploy again resets the mission',async({page})=>{
  test.setTimeout(40000);
  await page.goto('/');await page.getByRole('button',{name:'Take command'}).click();
  await expect(page.locator('#status')).toHaveText('CRITICAL HIT',{timeout:28000});
  await page.screenshot({path:'test-results/ship-explosion.png'});
  await expect(page.getByRole('heading',{name:'Lost to the deep.'})).toBeVisible({timeout:8000});
  await page.getByRole('button',{name:'Deploy again'}).click();
  await expect(page.locator('#status')).toHaveText('ENGAGEMENT ACTIVE');await expect(page.locator('#contacts')).toHaveText('05');await expect(page.locator('#shots')).toHaveText('00');
});
